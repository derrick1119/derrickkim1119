/**
 * 🎆 밤하늘 불꽃 잇기 (44라운드 — 작은 손맛 장난감) — 연쇄 폭발 × 가리키기(톡).
 * 한 동작: 밤하늘을 톡 → 그 자리에서 불꽃이 펑 → 둘레에 떠 있는 등불에 옮겨붙어 줄줄이 터지며 하늘 전체가 번쩍.
 * 등불마다 터지는 모양이 달라 연쇄가 갈린다: 동그라미(둘레) · 긴 등(가로로 쫙) · 소용돌이(빙글 넓게, 오래) · 쪼개짐(작은 불씨 다섯이 날아가 펑)
 *   · 물고기 등(호수로 풍덩 → 물보라 불꽃이 위로) · 별사탕(맞으면 불씨 +1) · 큰 국화(하늘 가득 금빛) · 용 연(하늘을 가로지르며 줄줄이).
 * 기다림 없음: 연쇄가 터지는 동안 또 톡 하면 그 불꽃도 같은 연쇄에 이어진다(숫자가 이어서 올라감). 연쇄의 n번째 등불 = n점.
 * 판 = 밤 하나: 하늘 셋(등불을 마을에서 띄울 때마다 불씨 3개, 남은 불씨는 다음 하늘로) → 피날레(남은 불씨) → 결과(점수·최고·새 등불) → 톡 = 다음 밤.
 *   밤마다 새 등불 하나: 1 동그라미·긴 등 → 2 소용돌이 → 3 쪼개짐 → 4 물고기 → 5 별사탕 → 6 큰 국화 → 7 용 연(축제 끝).
 * 별(밤마다): 밤 마침 · 등불 절반 밝히기 · 한 번에 N개 연쇄.
 * 처음 10초는 안 눌러도 잃는 것 없음(불씨는 그대로). 오래 안 누르면 등불이 바람 타고 날아가 다음 하늘로 — 불씨는 남는다.
 */
import { type Rng, mulberry32 } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5, TAU = Math.PI * 2;
/** 호수 수면(화면 폭 단위 세로) — 아래 1/4은 호수 */
const HZ = 1.12;
const NIGHTS = 7, VOLLEYS = 3, EMBERS = 3, MAX_EMBERS = 9;
/** 옮겨붙고 터지기까지 · 마지막 불꽃 뒤 연쇄가 살아 있는 틱 · 이만큼 지나면 등불이 빨리 날아감 */
const FUSE = 5, RISE_T = 60 * 14;
/** 이음: 연쇄 끝 등불 둘레 빛 고리 — 처음 반지름 · 고리가 사는 틱(줄어들며 꺼짐) · 끝 등불 몇 개까지 · 곱 최대 */
const JOIN_R = 0.3, JOIN_T = 96, JOIN_ENDS = 4, MULT_MAX = 9;
/** 결과: 톡 받기 시작 · 저절로 다음 밤 · 피날레 간격 · 남은 불씨 보너스 · 하늘을 다 밝히면 */
const RES_MIN = 60, RES_AUTO = 60 * 7, FIN_STEP = 13, FIN_PTS = 25, CLEAR_PTS = 300;
/** 마을에서 띄우기: 최소 틱 · 더하는 틱 · 늦게 뜨는 틱 */
const REL_MIN = 32, REL_VAR = 22, REL_DELAY = 20;
/** 별 셋째: 밤마다 한 번에 몇 개 연쇄 */
export const STAR3 = [20, 15, 20, 24, 26, 34, 34];

// ───────────────────────────── 등불 ─────────────────────────────
export type Kind = 'round' | 'long' | 'swirl' | 'split' | 'fish' | 'candy' | 'mum' | 'dragon';
type BK = Kind | 'ember' | 'mini' | 'splash' | 'show';
export const KD: Record<Kind, { name: string; r: number; w: number }> = {
  round: { name: '동그라미 등', r: 0.03, w: 13 },
  long: { name: '긴 등', r: 0.026, w: 4 },
  swirl: { name: '소용돌이 등', r: 0.032, w: 3.5 },
  split: { name: '쪼개짐 등', r: 0.034, w: 3 },
  fish: { name: '물고기 등', r: 0.032, w: 3 },
  candy: { name: '별사탕', r: 0.03, w: 1.2 },
  mum: { name: '큰 국화', r: 0.046, w: 0.9 },
  dragon: { name: '용 연', r: 0.04, w: 0 },
};
/** 밤마다 풀리는 등불 */
export const UNLOCK: Kind[][] = [['round', 'long'], ['swirl'], ['split'], ['fish'], ['candy'], ['mum'], ['dragon']];
/** 미리 보기 한 줄(결과 카드) */
const NEWS: Record<Kind, string> = {
  round: '둥글게 펑', long: '옆으로 길게 쫙', swirl: '빙글 돌며 넓게', split: '작은 불씨 다섯이 날아가 펑',
  fish: '호수로 풍덩 — 물보라 불꽃', candy: '맞으면 불씨 +1', mum: '하늘 가득 금빛', dragon: '하늘을 가로지르며 줄줄이',
};

/** 닿는 범위(화면 폭 단위) */
const R_EMBER = 0.1, R_ROUND = 0.105, R_LONG = 0.2, H_LONG = 0.04, R_SWIRL = 0.15, R_CANDY = 0.085, R_MUM = 0.28;
const R_SPLIT0 = 0.055, SUB_D = 0.13, R_SUBP = 0.03, R_MINI = 0.065, FISH_W = 0.04, R_SPLASH = 0.18, R_DRAG = 0.075, R_DRAG_END = 0.14;
const BP: Record<BK, { R: number; H: number; grow: number; life: number }> = {
  ember: { R: R_EMBER, H: 0, grow: 6, life: 54 },
  round: { R: R_ROUND, H: 0, grow: 8, life: 74 },
  long: { R: R_LONG, H: H_LONG, grow: 12, life: 70 },
  swirl: { R: R_SWIRL, H: 0, grow: 30, life: 100 },
  split: { R: R_SPLIT0, H: 0, grow: 6, life: 44 },
  fish: { R: 0.05, H: 0, grow: 5, life: 40 },
  candy: { R: R_CANDY, H: 0, grow: 8, life: 76 },
  mum: { R: R_MUM, H: 0, grow: 26, life: 130 },
  dragon: { R: R_DRAG_END, H: 0, grow: 10, life: 96 },
  mini: { R: R_MINI, H: 0, grow: 6, life: 52 },
  splash: { R: R_SPLASH, H: 0, grow: 14, life: 80 },
  show: { R: 0.2, H: 0, grow: -1, life: 100 },
};
/** 날아가는 것의 닿는 반지름 */
const MR = { sub: R_SUBP, dive: FISH_W, drag: R_DRAG };

interface Lan {
  id: number; k: Kind; col: number;
  x: number; y: number; tx: number; ty: number; x0: number; y0: number;
  born: number; rel: number; vy: number; ph: number; amp: number; sz: number;
  /** 0 떠 있음 · 1 옮겨붙음 · 2 터짐 · 3 날아감 */
  st: number; fuse: number; sa: number; dir: number; feat: boolean; ch: number;
}
interface Burst { id: number; k: BK; x: number; y: number; t0: number; R: number; H: number; grow: number; life: number; n: number; col: number; seed: number; ch: number }
interface Mover { id: number; k: 'sub' | 'dive' | 'drag'; x0: number; y0: number; t0: number; dur: number; a: number; dir: number; col: number; dead: boolean; ch: number }
/** 연쇄: 터진 수 · 곱(이음마다 +1) · 마지막으로 움직인 틱 · 끝 등불(이음 고리 자리) */
export interface Chain { id: number; n: number; mult: number; last: number; cx: number; cy: number; taps: number; ends: [number, number, number][] }
interface Ev { id: number; t: number; k: string; x: number; y: number; n: number; kind?: BK; ax?: number; ay?: number }

export interface FwState {
  rng: Rng; seed: number; t: number;
  /** 밤(판) 번호 0~6 · 하늘 0~2 · 하늘 안 틱 */
  stage: number; vol: number; vt: number;
  phase: 'play' | 'finale' | 'result' | 'end';
  pt: number; embers: number; fin: number;
  lans: Lan[]; bursts: Burst[]; movers: Mover[];
  /** 지금 살아 있는 연쇄들 (고리 밖을 톡 하면 새 연쇄가 따로 선다) */
  chains: Chain[]; nid: number;
  pts: number; nightPts: number; released: number; lit: number; bestChain: number; volN: number; volLit: number;
  nights: number[]; bestNight: number; newBest: boolean; got: number; stars: boolean[];
  newKind: Kind | null; spot: number;
  seen: Set<string>; wowN: number; cheer: number;
  down: boolean; firstTap: number; lastTap: number; taps: number; joins: number;
  events: Ev[]; evN: number; wind: number; done: boolean;
  /** 손가락이 가리키는 등불 */
  hint: number;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const easeOut3 = (u: number) => 1 - (1 - clamp(u, 0, 1)) ** 3;
const settled = (s: FwState, L: Lan) => s.t - L.born >= L.rel;
/** 이음 고리 반지름 (끝 등불이 터진 뒤 age틱): 크게 시작해 줄어들다 꺼진다 */
export const ringR = (age: number) => (age >= JOIN_T ? 0 : JOIN_R * (1 - 0.6 * (age / JOIN_T)));
const chainOf = (s: FwState, id: number) => s.chains.find((c) => c.id === id);
/** 가장 큰 살아 있는 연쇄 (위 배지에 보이는 것) */
export const topChain = (s: FwState) => s.chains.reduce<Chain | null>((a, c) => (!a || c.n > a.n ? c : a), null);
/** 이 자리가 어느 연쇄의 이음 고리 안인가 (여럿이면 큰 쪽) */
export function joinAt(s: FwState, x: number, y: number, k = 1): { c: Chain; ax: number; ay: number } | null {
  let best: { c: Chain; ax: number; ay: number } | null = null;
  for (const c of s.chains)
    for (const [ax, ay, at] of c.ends) {
      const r = ringR(s.t - at) * k;
      if (r > 0 && (x - ax) ** 2 + (y - ay) ** 2 < r * r && (!best || c.n > best.c.n)) best = { c, ax, ay };
    }
  return best;
}

function ev(s: FwState, k: string, x: number, y: number, n = 0, kind?: BK, ax?: number, ay?: number) {
  s.events.push({ id: ++s.evN, t: s.t, k, x, y, n, kind, ax, ay });
  if (s.events.length > 100) s.events.splice(0, s.events.length - 80);
}

/** 날아가는 것의 자리 (τ틱 뒤) */
function mpos(m: { k: Mover['k']; x0: number; y0: number; a: number; dir: number; dur: number }, tau: number): [number, number] {
  const u = clamp(tau, 0, m.dur);
  if (m.k === 'sub') {
    const e = 1 - (1 - u / m.dur) ** 2;
    return [m.x0 + Math.cos(m.a) * SUB_D * e, m.y0 + Math.sin(m.a) * SUB_D * e + 0.00002 * u * u];
  }
  if (m.k === 'dive') return [m.x0 + Math.sin(u * 0.3) * 0.006, m.y0 + 0.0012 * u + 0.00055 * u * u];
  return [m.x0 + m.dir * 0.013 * u, m.y0 + 0.09 * Math.sin(u * 0.13)];
}
const diveDur = (y0: number) => Math.max(4, Math.ceil((-0.0012 + Math.sqrt(0.0012 ** 2 + 4 * 0.00055 * Math.max(0.01, HZ - 0.005 - y0))) / 0.0011));
const dragDir = (x: number) => (x < 0.5 ? 1 : -1);
const dragDur = (x: number) => Math.ceil((dragDir(x) > 0 ? 0.95 - x : x - 0.05) / 0.013);

function inB(b: Burst, x: number, y: number, f: number) {
  const dx = x - b.x, dy = y - b.y, r = b.R * f;
  if (b.k === 'long') return Math.abs(dy) < b.H && Math.abs(dx) < r;
  if (b.k === 'splash') return dy < 0.01 && dx * dx + dy * dy < r * r;
  return dx * dx + dy * dy < r * r;
}

// ───────────────────────────── 하늘 만들기 ─────────────────────────────
/** 떨어진 무리 몇 개 — 톡 한 번은 한 무리, 이어 붙여야 하늘 가득 (무리 사이 틈은 이음 고리 + 불씨로 건너는 거리) */
function layout(s: FwState): [number, number][] {
  // 무리 자리: 3×3 칸을 이웃끼리 한 줄로 이어 가며 고른다 — 다음 무리는 늘 이음 고리가 닿는 거리
  const r = s.rng, C = Math.min(6, 4 + (s.stage >= 3 ? 1 : 0) + (s.stage >= 5 ? 1 : 0) + (r() < 0.3 ? 1 : 0)), cells: number[] = [r() < 0.6 ? 4 : Math.floor(r() * 9)];
  const nb = (c: number) => [c - 3, c + 3, c % 3 ? c - 1 : -1, c % 3 < 2 ? c + 1 : -1].filter((q) => q >= 0 && q < 9 && !cells.includes(q));
  while (cells.length < C) {
    let opts = nb(cells[cells.length - 1]);
    if (!opts.length) opts = [...new Set(cells.flatMap(nb))];
    cells.push(opts[Math.floor(r() * opts.length)]);
  }
  const cs = cells.map((c): [number, number] => [0.2 + (c % 3) * 0.3 + (r() - 0.5) * 0.04, 0.3 + Math.floor(c / 3) * 0.275 + (r() - 0.5) * 0.03]);
  const pts: [number, number][] = [];
  for (const [cx, cy] of cs) {
    const n = 6 + Math.floor(r() * 3) + (s.stage >= 4 ? 1 : 0);
    for (let i = 0; i < n; i++)
      for (let k = 0; k < 30; k++) {
        const a = r() * TAU, d = Math.sqrt(r()) * 0.07, x = clamp(cx + Math.cos(a) * d, 0.05, 0.95), y = clamp(cy + Math.sin(a) * d * 0.9, 0.2, 0.94);
        if (pts.every((q) => (q[0] - x) ** 2 + (q[1] - y) ** 2 > 0.044 ** 2)) {
          pts.push([x, y]);
          break;
        }
      }
  }
  return pts;
}
/** 첫 밤 첫 하늘: 촘촘한 그물 — 어디를 톡 해도 하늘 전체가 줄줄이 (첫 1초가 가장 시원하게) */
function webLayout(s: FwState): [number, number][] {
  const pts: [number, number][] = [], sp = 0.095;
  for (let row = 0, y = 0.27; y < 0.98; row++, y += sp * 0.87)
    for (let x = 0.08 + (row % 2) * sp * 0.5; x < 0.93; x += sp) if (s.rng() < 0.72) pts.push([x + (s.rng() - 0.5) * 0.024, y + (s.rng() - 0.5) * 0.024]);
  return pts;
}
function pickKind(s: FwState): Kind {
  const ks = UNLOCK.slice(0, s.stage + 1).flat().filter((k) => k !== 'dragon' && k !== 'mum');
  let tot = 0;
  const ws = ks.map((k) => {
    const w = KD[k].w * (s.stage > 0 && k !== 'candy' && UNLOCK[s.stage].includes(k) ? 2 : 1);
    tot += w;
    return w;
  });
  let x = s.rng() * tot;
  for (let i = 0; i < ks.length; i++) if ((x -= ws[i]) <= 0) return ks[i];
  return ks[0];
}
function makeLan(s: FwState, k: Kind, x: number, y: number, now: boolean): Lan {
  const r = s.rng;
  const L: Lan = {
    id: ++s.nid, k, col: Math.floor(r() * 3), x, y, tx: x, ty: y, x0: clamp(x + (r() - 0.5) * 0.1, 0.05, 0.95), y0: 1.03 + r() * 0.04,
    born: now ? -9999 : s.t + Math.floor(r() * REL_DELAY), rel: now ? 0 : REL_MIN + Math.floor(r() * REL_VAR), ch: 0,
    vy: 0.00011 + r() * 0.00009, ph: r() * TAU, amp: 0.005 + r() * 0.012, sz: 0.92 + r() * 0.22, st: 0, fuse: 0, sa: r() * TAU, dir: dragDir(x), feat: false,
  };
  if (!now) (L.x = L.x0), (L.y = L.y0);
  s.lans.push(L);
  return L;
}
/** 마을에서 등불을 한꺼번에 띄운다 + 불씨 3개 */
function spawnVolley(s: FwState) {
  for (const L of s.lans) if (L.st === 0) L.st = 3;
  s.vt = 0;
  s.wind = (s.rng() - 0.5) * 0.00007;
  const first = s.stage === 0 && s.vol === 0;
  const pts = first ? webLayout(s) : layout(s);
  const ks = pts.map(() => pickKind(s));
  const nk = UNLOCK[s.stage][0];
  if (first) {
    // 가운데 큰 국화 하나 — 첫 톡의 연쇄가 0.5초 안에 닿아 하늘 전체가 금빛으로
    let mi = 0, md = 9;
    pts.forEach((p, i) => {
      const d = Math.hypot(p[0] - 0.5, p[1] - 0.52);
      if (d < md) (md = d), (mi = i);
    });
    ks[mi] = 'mum';
  } else if (s.stage > 0 && nk !== 'dragon') {
    // 이번 밤 새 등불은 넉넉히(첫 하늘엔 더)
    const need = nk === 'mum' ? 2 : nk === 'candy' ? (s.vol === 0 ? 3 : 2) : s.vol === 0 ? 5 : 3;
    let have = ks.filter((k) => k === nk).length;
    for (let g = 0; have < need && g < 200; g++) {
      const j = Math.floor(s.rng() * ks.length);
      if (ks[j] === 'round' || ks[j] === 'long') (ks[j] = nk), have++;
    }
  }
  if (!first && s.stage >= 5 && !ks.includes('mum')) ks[Math.floor(s.rng() * ks.length)] = 'mum';
  let feat: Lan | null = null, fd = 9;
  pts.forEach((p, i) => {
    const L = makeLan(s, ks[i], p[0], p[1], first);
    s.seen.add('k:' + L.k);
    if (s.vol === 0 && s.stage > 0 && L.k === nk) {
      const d = Math.hypot(p[0] - 0.5, p[1] - 0.55);
      if (d < fd) (fd = d), (feat = L);
    }
  });
  if (s.stage >= 6) {
    const L = makeLan(s, 'dragon', 0.2 + s.rng() * 0.6, 0.2 + s.rng() * 0.08, false);
    s.seen.add('k:dragon');
    if (s.vol === 0) feat = L;
  }
  if (feat) ((feat as Lan).feat = true), (s.spot = (feat as Lan).id);
  s.volN = s.lans.filter((L) => L.st === 0).length;
  s.volLit = 0;
  s.released += s.volN;
  s.embers += EMBERS;
  ev(s, 'volley', 0.5, 1.05, s.vol);
}

// ───────────────────────────── 터짐 · 옮겨붙음 ─────────────────────────────
function mkBurst(s: FwState, k: BK, x: number, y: number, n: number, col = 0, ch = 0): Burst {
  const P = BP[k];
  const b: Burst = { id: ++s.nid, k, x, y, t0: s.t, R: P.R, H: P.H, grow: P.grow, life: P.life, n, col, seed: (s.nid * 7919) % 10007, ch };
  s.bursts.push(b);
  return b;
}
function mkMover(s: FwState, k: Mover['k'], x0: number, y0: number, a = 0, col = 0, ch = 0) {
  const m: Mover = { id: ++s.nid, k, x0, y0, t0: s.t, dur: 0, a, dir: dragDir(x0), col, dead: false, ch };
  m.dur = k === 'sub' ? 14 : k === 'dive' ? diveDur(y0) : dragDur(x0);
  s.movers.push(m);
}
function newChain(s: FwState, x: number, y: number): Chain {
  const c: Chain = { id: ++s.nid, n: 0, mult: 1, last: s.t, cx: x, cy: y, taps: 0, ends: [] };
  s.chains.push(c);
  return c;
}
function ignite(s: FwState, L: Lan, ch: number) {
  L.st = 1;
  L.ch = ch;
  L.fuse = s.t + FUSE + Math.floor(s.rng() * 4);
}
function explode(s: FwState, L: Lan) {
  L.st = 2;
  const c = chainOf(s, L.ch) ?? newChain(s, L.x, L.y), ch = c.id;
  c.n++;
  c.cx = L.x;
  c.cy = L.y;
  c.last = s.t;
  c.ends.push([L.x, L.y, s.t]);
  if (c.ends.length > JOIN_ENDS) c.ends.shift();
  // n번째 등불 = n점 × 이음 곱
  s.pts += c.n * c.mult;
  s.nightPts += c.n * c.mult;
  s.lit++;
  s.volLit++;
  s.bestChain = Math.max(s.bestChain, c.n);
  s.cheer = Math.min(1, s.cheer + 0.035 + c.n * 0.0014);
  if (L.k === 'split') {
    mkBurst(s, 'split', L.x, L.y, c.n, L.col, ch);
    for (let j = 0; j < 5; j++) mkMover(s, 'sub', L.x, L.y, L.sa + (j * TAU) / 5, L.col, ch);
  } else if (L.k === 'fish') {
    mkBurst(s, 'fish', L.x, L.y, c.n, L.col, ch);
    mkMover(s, 'dive', L.x, L.y, 0, L.col, ch);
  } else if (L.k === 'dragon') mkMover(s, 'drag', L.x, L.y, 0, L.col, ch);
  else {
    mkBurst(s, L.k, L.x, L.y, c.n, L.col, ch);
    if (L.k === 'candy') (s.embers = Math.min(MAX_EMBERS, s.embers + 1)), ev(s, 'candy', L.x, L.y, s.embers);
  }
  ev(s, 'burst', L.x, L.y, c.n, L.k, c.mult);
  if (c.n === 12 || c.n === 30 || c.n === 60) (s.wowN++), ev(s, 'wow', L.x, L.y, c.n);
}
/** 한 틱: 퍼지는 불꽃 · 날아가는 것 · 옮겨붙은 등불 (연쇄마다 따로 센다) */
function propagate(s: FwState) {
  const busy = new Set<number>();
  for (const b of s.bursts) {
    const age = s.t - b.t0;
    if (b.grow < 0 || age > b.grow + 1) continue;
    busy.add(b.ch);
    const f = easeOut3((age + 1) / (b.grow + 1));
    for (const L of s.lans) if (L.st === 0 && settled(s, L) && inB(b, L.x, L.y, f)) ignite(s, L, b.ch);
  }
  for (const m of s.movers) {
    busy.add(m.ch);
    const tau = s.t - m.t0, [x, y] = mpos(m, tau), r = MR[m.k];
    for (const L of s.lans) if (L.st === 0 && settled(s, L) && (L.x - x) ** 2 + (L.y - y) ** 2 < r * r) ignite(s, L, m.ch);
    if (tau >= m.dur) {
      m.dead = true;
      const n = chainOf(s, m.ch)?.n ?? 0;
      if (m.k === 'sub') mkBurst(s, 'mini', x, y, n, m.col, m.ch);
      else if (m.k === 'dive') mkBurst(s, 'splash', x, HZ - 0.005, n, 0, m.ch), ev(s, 'splash', x, HZ, n);
      else mkBurst(s, 'dragon', x, y, n, 0, m.ch), ev(s, 'dragonEnd', x, y, n);
    }
  }
  if (s.movers.some((m) => m.dead)) s.movers = s.movers.filter((m) => !m.dead);
  for (const L of s.lans)
    if (L.st === 1) {
      busy.add(L.ch);
      if (s.t >= L.fuse) explode(s, L);
    }
  for (const c of s.chains) if (busy.has(c.id)) c.last = s.t;
}
/** 연쇄가 지금 퍼지는 중인가 (조용해지면 이음 고리가 줄어든다) */
export const busyChain = (s: FwState, c: Chain) => s.t - c.last < 3;

function moveLans(s: FwState) {
  const boost = s.vt > RISE_T ? 1 + (s.vt - RISE_T) / 40 : 1;
  let floating = 0;
  for (const L of s.lans) if (L.st === 0) floating++;
  // 몇 개 안 남으면 바람이 데려간다 (남은 하나를 기다리지 않게)
  const sweep = !s.chains.length && floating <= 3 && s.vt > 150 ? 14 : 1;
  for (const L of s.lans) {
    if (L.st === 3) {
      L.ty -= 0.0075;
      L.tx += s.wind * 4;
      L.x = L.tx + L.amp * Math.sin(L.ph + s.t * 0.024);
      L.y = L.ty;
      continue;
    }
    if (L.k === 'dragon') {
      L.tx += L.dir * 0.0011;
      if ((L.tx < 0.16 && L.dir < 0) || (L.tx > 0.84 && L.dir > 0)) L.dir = -L.dir;
      L.ty -= L.vy * 0.3 * Math.max(boost, sweep);
    } else {
      L.ty -= L.vy * Math.max(boost, L.st === 0 ? sweep : 1);
      L.tx = clamp(L.tx + s.wind, 0.04, 0.96);
    }
    const age = s.t - L.born;
    if (age < 0) {
      L.x = L.x0;
      L.y = L.y0;
      continue;
    }
    if (age < L.rel) {
      const e = easeOut3(age / L.rel);
      L.x = L.x0 + (L.tx - L.x0) * e;
      L.y = L.y0 + (L.ty - L.y0) * e;
      continue;
    }
    L.x = L.tx + L.amp * Math.sin(L.ph + s.t * 0.024);
    L.y = L.ty + 0.004 * Math.sin(L.ph * 1.7 + s.t * 0.037);
  }
  if (s.lans.some((L) => L.st === 2 || L.y < -0.08)) s.lans = s.lans.filter((L) => L.st !== 2 && L.y > -0.08);
}

function tap(s: FwState, px: number, py: number) {
  if (s.embers <= 0) return ev(s, 'empty', px, py * A);
  s.embers--;
  s.taps++;
  s.lastTap = s.t;
  if (s.firstTap < 0) s.firstTap = s.t;
  const x = clamp(px, 0.04, 0.96), y = clamp(py * A, 0.12, 0.98);
  // 꺼져 가는 끝 등불의 빛 고리 안이면 이음: 같은 연쇄로 이어지고 곱 +1
  const j = joinAt(s, x, y);
  let c: Chain;
  if (j) {
    c = j.c;
    c.mult = Math.min(MULT_MAX, c.mult + 1);
    c.ends = [];
    s.joins++;
    s.seen.add('join');
    ev(s, 'join', x, y, c.mult, undefined, j.ax, j.ay);
  } else c = newChain(s, x, y);
  c.taps++;
  c.last = s.t;
  mkBurst(s, 'ember', x, y, c.n, 0, c.id);
  ev(s, 'tap', x, y, j ? c.mult : 0);
  s.hint = -1;
}
function endChain(s: FwState, c: Chain) {
  ev(s, 'chainEnd', c.cx, c.cy, c.n);
  s.chains = s.chains.filter((q) => q !== c);
}
function endVolley(s: FwState) {
  if (s.volN > 0 && s.volLit >= s.volN) {
    s.pts += CLEAR_PTS;
    s.nightPts += CLEAR_PTS;
    s.wowN++;
    s.seen.add('clear');
    ev(s, 'skyclear', 0.5, 0.5, CLEAR_PTS);
  }
  if (s.vol < VOLLEYS - 1) {
    s.vol++;
    spawnVolley(s);
  } else {
    s.phase = 'finale';
    s.pt = 0;
    s.fin = s.embers;
    s.embers = 0;
    for (const L of s.lans) if (L.st === 0) L.st = 3;
    ev(s, 'finale', 0.5, 0.5, s.fin);
  }
}
function toResult(s: FwState) {
  s.phase = 'result';
  s.pt = 0;
  s.stars = [true, s.lit * 2 >= s.released, s.bestChain >= STAR3[s.stage]];
  s.got = s.stars.filter(Boolean).length;
  s.newBest = s.stage > 0 && s.nightPts > s.bestNight;
  s.bestNight = Math.max(s.bestNight, s.nightPts);
  s.nights.push(s.nightPts);
  s.newKind = s.stage + 1 < NIGHTS ? UNLOCK[s.stage + 1][0] : null;
  ev(s, 'result', 0.5, 0.5, s.got);
}
function nextNight(s: FwState) {
  if (s.stage + 1 >= NIGHTS) {
    s.done = true;
    s.phase = 'end';
    return;
  }
  s.stage++;
  s.vol = 0;
  s.nightPts = 0;
  s.released = 0;
  s.lit = 0;
  s.bestChain = 0;
  s.embers = 0;
  s.stars = [false, false, false];
  s.got = 0;
  s.phase = 'play';
  s.pt = 0;
  spawnVolley(s);
  ev(s, 'night', 0.5, 0.5, s.stage);
}

// ───────────────────────────── 내다보기 (잘하는 봇 · 손가락 안내) ─────────────────────────────
/** 0 원(x,y,r) · 1 가로 띠(x,y,반폭,반높이) · 2 위쪽 반원(x,y,r) · 3 아래로 뻗은 세로 띠(x,y0,반폭,y1) */
type Zone = [number, number, number, number, number];
function zonesOf(L: { k: Kind; x: number; y: number; sa: number }): Zone[] {
  const { x, y } = L;
  switch (L.k) {
    case 'round': return [[0, x, y, R_ROUND, 0]];
    case 'long': return [[1, x, y, R_LONG, H_LONG]];
    case 'swirl': return [[0, x, y, R_SWIRL, 0]];
    case 'candy': return [[0, x, y, R_CANDY, 0]];
    case 'mum': return [[0, x, y, R_MUM, 0]];
    case 'split': {
      const z: Zone[] = [[0, x, y, R_SPLIT0, 0]];
      for (let j = 0; j < 5; j++) {
        const m = { k: 'sub' as const, x0: x, y0: y, a: L.sa + (j * TAU) / 5, dir: 1, dur: 14 };
        const [ex, ey] = mpos(m, 14), [hx, hy] = mpos(m, 5);
        z.push([0, ex, ey, R_MINI, 0], [0, hx, hy, R_SUBP, 0]);
      }
      return z;
    }
    case 'fish': return [[0, x, y, 0.05, 0], [3, x, y, FISH_W, HZ], [2, x, HZ - 0.005, R_SPLASH, 0]];
    case 'dragon': {
      const m = { k: 'drag' as const, x0: x, y0: y, a: 0, dir: dragDir(x), dur: dragDur(x) }, z: Zone[] = [];
      for (let u = 0; u < m.dur; u += 4) {
        const [px, py] = mpos(m, u);
        z.push([0, px, py, R_DRAG, 0]);
      }
      const [ex, ey] = mpos(m, m.dur);
      z.push([0, ex, ey, R_DRAG_END, 0]);
      return z;
    }
  }
}
function inZ(z: Zone, px: number, py: number) {
  switch (z[0]) {
    case 0: return (px - z[1]) ** 2 + (py - z[2]) ** 2 < z[3] * z[3];
    case 1: return Math.abs(py - z[2]) < z[4] && Math.abs(px - z[1]) < z[3];
    case 2: return py < z[2] + 0.01 && (px - z[1]) ** 2 + (py - z[2]) ** 2 < z[3] * z[3];
    default: return Math.abs(px - z[1]) < z[3] && py > z[2] && py < z[4];
  }
}
/** 지금 톡 하면 몇 개가 터지나 — 이미 터질 것(지금 연쇄)은 빼고 셈한다.
 *  join = true: 이음 고리 안 자리만 (고리 안 0.85배까지 — 손가락 오차 여유) — 값은 (이어지는 번호 × 늘어난 곱)으로 */
export function plan(s: FwState, join = false): { x: number; y: number; n: number; v: number; join: boolean } | null {
  const L = s.lans.filter((l) => l.st === 0 && settled(s, l) && l.y > 0.1);
  const n = L.length;
  if (!n) return null;
  const Z = L.map(zonesOf), adj: number[][] = L.map(() => []);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && Z[i].some((z) => inZ(z, L[j].x, L[j].y))) adj[i].push(j);
  const doom = new Uint8Array(n), q: number[] = [];
  const mark = (j: number) => void (doom[j] || ((doom[j] = 1), q.push(j)));
  for (const b of s.bursts) if (b.grow >= 0 && s.t - b.t0 <= b.grow + 1) for (let j = 0; j < n; j++) if (inB(b, L[j].x, L[j].y, 1)) mark(j);
  for (const m of s.movers) {
    for (let u = s.t - m.t0; u <= m.dur; u += 3) {
      const [x, y] = mpos(m, u);
      for (let j = 0; j < n; j++) if ((L[j].x - x) ** 2 + (L[j].y - y) ** 2 < MR[m.k] ** 2) mark(j);
    }
    const [ex, ey] = mpos(m, m.dur), er = m.k === 'sub' ? R_MINI : m.k === 'dive' ? R_SPLASH : R_DRAG_END, ey2 = m.k === 'dive' ? HZ : ey;
    for (let j = 0; j < n; j++) if ((L[j].x - ex) ** 2 + (L[j].y - ey2) ** 2 < er * er) mark(j);
  }
  for (const F of s.lans)
    if (F.st === 1) {
      const zf = zonesOf(F);
      for (let j = 0; j < n; j++) if (zf.some((z) => inZ(z, L[j].x, L[j].y))) mark(j);
    }
  while (q.length) for (const j of adj[q.pop()!]) mark(j);
  const vis = new Uint8Array(n), st: number[] = [], r2 = (R_EMBER * 0.85) ** 2;
  /** 이 자리에 불씨를 놓으면 (몇 개, 값) */
  const count = (px: number, py: number): [number, number] => {
    vis.fill(0);
    let cnt = 0, val = 0;
    for (let j = 0; j < n; j++) if (!doom[j] && (L[j].x - px) ** 2 + (L[j].y - py) ** 2 < r2) (vis[j] = 1), st.push(j);
    while (st.length) {
      const a = st.pop()!;
      cnt++;
      val += L[a].k === 'candy' ? 3 : 1;
      for (const b of adj[a]) if (!vis[b] && !doom[b]) (vis[b] = 1), st.push(b);
    }
    return [cnt, val];
  };
  let best: { x: number; y: number; n: number; v: number; join: boolean } | null = null;
  const consider = (px: number, py: number, k: number) => {
    const [cnt, val] = count(px, py);
    if (!cnt) return;
    // 같으면 하늘 가운데 쪽 (사람처럼 — 손가락 안내도 같은 자리)
    const v = val * k - Math.hypot(px - 0.5, py - 0.6) * 0.5;
    if (!best || v > best.v) best = { x: px, y: py, n: cnt, v, join };
  };
  if (!join) {
    for (let i = 0; i < n; i++) if (!doom[i]) consider(L[i].x, L[i].y, 1);
    return best;
  }
  for (const c of s.chains) {
    // 이어 붙이면: 번호가 c.n부터 이어지고 곱이 하나 는다 → 한 개당 대략 (c.n + 개수/2) × (곱+1)
    const k = (c.n + 4) * Math.min(MULT_MAX, c.mult + 1);
    for (const [ax, ay, at] of c.ends) {
      const r = ringR(s.t - at + 4) * 0.85;
      if (r <= 0.02) continue;
      for (let i = 0; i < n; i++) {
        if (doom[i]) continue;
        const d = Math.hypot(L[i].x - ax, L[i].y - ay);
        if (d < r) consider(L[i].x, L[i].y, k);
        else if (d < r + R_EMBER * 0.8) consider(ax + ((L[i].x - ax) * r) / d, ay + ((L[i].y - ay) * r) / d, k);
      }
    }
  }
  return best;
}

// ───────────────────────────── 게임 ─────────────────────────────
const game: GameDef<FwState> & { wows(s: FwState): number } = {
  id: 'nightfirework',
  name: '밤하늘 불꽃 잇기',
  genes: ['nightfirework', 'chain', 'pointer'],
  twist: '톡 한 번이 불씨 하나 — 그 자리 불꽃이 떠 있는 등불에 옮겨붙어 줄줄이 터지는데, 등불마다 터지는 모양(둘레·가로 줄·소용돌이·쪼개짐·물고기 풍덩·용)이 달라 연쇄가 갈리고, 터지는 동안 또 톡 하면 같은 연쇄로 이어져 숫자가 계속 오른다',
  rules: [
    '밤하늘을 톡 — 불꽃이 펑, 가까운 등불에 옮겨붙어 줄줄이 터져요.',
    '등불마다 터지는 모양이 달라요. 하늘마다 불씨 3개, 남으면 다음 하늘로.',
    '연쇄가 꺼져 가는 빛 고리 안을 톡 → 이음! 번호가 이어지고 곱 ×2, ×3…',
  ],
  controls: 'touch',
  hint: '밤하늘을 톡 = 불꽃 / 화살표로 옮기고 스페이스',
  aspect: A,
  art: {
    concept: '호숫가 마을의 등불 축제 밤 — 얼굴 있는 종이 등불이 하늘 가득 떠오르고, 톡 하면 불꽃이 등불에서 등불로 옮겨붙어 하늘과 호수가 함께 번쩍',
    mood: '짙은 남보라 밤하늘에 초승달, 산 너머 따뜻한 노을 기운. 지붕 위 아이·할아버지·강아지가 올려다보며 환호하고, 호수 가운데 조각배의 꼬마가 불씨 단지를 든다. 동그란 등·긴 등·소용돌이 등·물고기 등·별사탕·큰 국화·용 연이 저마다 다른 모양으로 펑, 호수에 거꾸로 비친다.',
    palette: { bg: '#141a4f', ink: '#fff3d6', muted: '#9aa3d8', accent: '#ffcf4a', hot: '#ff5a4a', soft: '#2a2f6e' },
  },
  guard: (s) => s.embers,
  cleared: (s) => (s.phase === 'result' ? { stage: s.stage, got: s.got, of: 3 } : null),
  reveals: (s) => s.seen.size,
  wows: (s) => s.wowN,
  create(seed) {
    const s: FwState = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, vol: 0, vt: 0, phase: 'play', pt: 0, embers: 0, fin: 0,
      lans: [], bursts: [], movers: [], chains: [], nid: 0,
      pts: 0, nightPts: 0, released: 0, lit: 0, bestChain: 0, volN: 0, volLit: 0,
      nights: [], bestNight: 0, newBest: false, got: 0, stars: [false, false, false], newKind: null, spot: -1,
      seen: new Set<string>(), wowN: 0, cheer: 0, down: false, firstTap: -1, lastTap: -999, taps: 0, joins: 0,
      events: [], evN: 0, wind: 0, done: false, hint: -1,
    };
    spawnVolley(s);
    // 손가락은 아래 가운데 등불 — 큰 국화까지 두 걸음
    let bi = 0, bd = 9;
    s.lans.forEach((L, i) => {
      const d = Math.hypot(L.x - 0.5, L.y - 0.7);
      if (L.k !== 'mum' && d < bd) (bd = d), (bi = i);
    });
    s.hint = s.lans[bi].id;
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ?? null, fresh = !!p && !s.down;
    s.down = !!p;
    s.cheer *= 0.986;
    if (s.phase === 'play') {
      s.vt++;
      if (fresh) tap(s, p!.x, p!.y);
      moveLans(s);
      propagate(s);
      // 이을 불씨나 이을 등불이 없으면 고리를 기다리지 않는다 (빈 하늘에서 멍하니 서 있지 않게)
      const canJoin = s.embers > 0 && s.lans.some((L) => L.st === 0);
      for (const c of [...s.chains]) if (s.t - c.last > (canJoin ? JOIN_T : 8)) endChain(s, c);
      if (!s.chains.length && s.vt > 20 && (s.embers <= 0 || !s.lans.some((L) => L.st === 0 || L.st === 1))) endVolley(s);
    } else if (s.phase === 'finale') {
      s.pt++;
      moveLans(s);
      if (s.fin > 0 && s.pt % FIN_STEP === 1) {
        const k = s.fin;
        mkBurst(s, 'show', 0.18 + ((k * 0.37) % 0.64), 0.3 + ((k * 0.23) % 0.35), 0, k % 4);
        s.pts += FIN_PTS;
        s.nightPts += FIN_PTS;
        s.fin--;
        ev(s, 'bonus', 0.5, 0.5, FIN_PTS);
      }
      if (s.fin <= 0 && s.pt > 34) toResult(s);
    } else if (s.phase === 'result') {
      s.pt++;
      moveLans(s);
      if ((fresh && s.pt > RES_MIN) || s.pt > RES_AUTO) nextNight(s);
    }
    if (s.bursts.length && s.t - s.bursts[0].t0 > 140) s.bursts = s.bursts.filter((b) => s.t - b.t0 <= b.life);
  },
  over: (s) => s.done,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const nightfirework = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, wy: number): Input => ({ tap: false, dir: 0, pointer: { x, y: wy / A } });
const releasing = (s: FwState) => s.vt < 80 && s.lans.some((l) => l.st === 0 && !settled(s, l));

/** 잘하는 봇: 모양별 닿는 범위로 내다봐 가장 많이 잇는 무리 · 연쇄가 잦아들면 이음 고리 안에서 다음 무리로 이어 붙이기 */
export const nightfireworkSmart: Bot<FwState> = {
  name: '가장 많이 잇는 곳 · 고리 안에서 이어 붙이기',
  act(s) {
    if (s.down) return NO;
    if (s.phase === 'result') return s.pt > RES_MIN + 3 ? at(0.5, 0.7) : NO;
    if (s.phase !== 'play' || s.embers <= 0 || s.t - s.lastTap < 6) return NO;
    if (s.chains.length) {
      if (s.chains.some((c) => busyChain(s, c))) return NO;
      const j = plan(s, true), p = plan(s);
      if (j && (!p || j.v >= p.v)) return at(j.x, j.y);
      return p ? at(p.x, p.y) : NO;
    }
    if (releasing(s)) return NO;
    const p = plan(s);
    return p ? at(p.x, p.y) : NO;
  },
};

const dumbMem = new WeakMap<object, { next: number; down: boolean; x: number; y: number }>();
/** 못하는 봇: 아무 때나 아무 데나 톡 */
export const nightfireworkRandom: Bot<FwState> = {
  name: '아무 때나 아무 데나 톡',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 8 + Math.floor(rng() * 40), down: false, x: 0.5, y: 0.5 }));
    if (s.t >= m.next) {
      m.down = !m.down;
      if (m.down) {
        m.next = s.t + 3 + Math.floor(rng() * 5);
        m.x = 0.04 + rng() * 0.92;
        m.y = 0.08 + rng() * 0.86;
      } else m.next = s.t + 25 + Math.floor(rng() * 110);
    }
    return m.down ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y } } : NO;
  },
};

/** 버릇 봇 공통: 연쇄가 끝나면 다음 불씨 (기다렸다 하나씩) */
function habit(s: FwState, f: () => Input): Input {
  if (s.down) return NO;
  if (s.phase === 'result') return s.pt > RES_MIN + 3 ? at(0.5, 0.7) : NO;
  if (s.phase !== 'play' || s.embers <= 0 || s.chains.length || releasing(s) || s.t - s.lastTap < 20) return NO;
  return f();
}
/** 버릇 봇: 늘 하늘 가운데 */
export const nightfireworkHabit: Bot<FwState> = {
  name: '늘 하늘 가운데 톡',
  act: (s) => habit(s, () => at(0.5, 0.56)),
};
/** 독립 버릇 봇: 늘 하늘 가운데에서 가장 가까운 등불 */
export const nightfireworkHabit2: Bot<FwState> = {
  name: '늘 가운데에 가장 가까운 등불 톡',
  act: (s) =>
    habit(s, () => {
      let b: Lan | null = null, bd = 9;
      for (const L of s.lans) {
        if (L.st !== 0 || !settled(s, L)) continue;
        const d = (L.x - 0.5) ** 2 + (L.y - 0.56) ** 2;
        if (d < bd) (bd = d), (b = L);
      }
      return b ? at(b.x, b.y) : at(0.5, 0.56);
    }),
};

// ═════════════════════════════ 그리기 ═════════════════════════════
type C2 = CanvasRenderingContext2D;
const OUT = '#2b1745', LW = 0.09;
const hsh = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
function ell(g: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  g.beginPath();
  g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
}
function lin(g: C2, x0: number, y0: number, x1: number, y1: number, ...st: [number, string][]) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of st) gr.addColorStop(o, c);
  return gr;
}
function radg(g: C2, x: number, y: number, r0: number, r1: number, ...st: [number, string][]) {
  const gr = g.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(0.01, r1));
  for (const [o, c] of st) gr.addColorStop(o, c);
  return gr;
}
function rr(g: C2, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)));
}
function starPath(g: C2, x: number, y: number, r: number, k = 0.47, rot = -Math.PI / 2, n = 5) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n, q = i % 2 ? r * k : r;
    if (i) g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
    else g.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  g.closePath();
}
function ink(g: C2, fill: string | CanvasGradient, lw = LW, stroke = OUT) {
  g.fillStyle = fill;
  g.fill();
  if (lw > 0) (g.strokeStyle = stroke), (g.lineWidth = lw), g.stroke();
}
function shine(g: C2, x: number, y: number, rx: number, ry: number, rot = -0.5, a = 0.6) {
  ell(g, x, y, rx, ry, rot);
  g.fillStyle = `rgba(255,255,255,${a})`;
  g.fill();
}
function layer(w: number, h: number, paint: (c: C2) => void) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.ceil(w));
  cv.height = Math.max(1, Math.ceil(h));
  paint(cv.getContext('2d')!);
  return cv;
}
const devScale = (ctx: C2) => (typeof ctx.getTransform === 'function' ? Math.min(3, Math.max(1, Math.round(ctx.getTransform().a || 1))) : 1);

// ── 스티커 굽기 (1/3옥타브 계단) ──
const SPR = new Map<string, HTMLCanvasElement>();
const sprQ = (px: number) => Math.ceil(2 ** (Math.ceil(Math.log2(Math.max(6, px)) * 3 - 1e-6) / 3));
interface Frame { w: number; h: number; ox: number; oy: number }
function spr(key: string, fr: Frame, px: number, paint: (g: C2) => void): HTMLCanvasElement {
  const q = sprQ(px), k = key + ':' + q;
  let cv = SPR.get(k);
  if (!cv) {
    if (SPR.size > 300) SPR.clear();
    cv = layer(fr.w * q, fr.h * q, (g) => {
      g.translate(fr.ox * q, fr.oy * q);
      g.scale(q, q);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      paint(g);
    });
    SPR.set(k, cv);
  }
  return cv;
}
function stamp(ctx: C2, cv: HTMLCanvasElement, fr: Frame, u: number) {
  ctx.drawImage(cv, -fr.ox * u, -fr.oy * u, fr.w * u, fr.h * u);
}
/** 빛 번짐 한 장 (색마다) — 'lighter'로 찍는다 */
const GLOW = new Map<string, HTMLCanvasElement>();
function glowSpr(rgb: string) {
  let cv = GLOW.get(rgb);
  if (!cv)
    GLOW.set(rgb, (cv = layer(64, 64, (g) => {
      g.fillStyle = radg(g, 32, 32, 0, 32, [0, `rgba(${rgb},1)`], [0.22, `rgba(${rgb},.55)`], [0.55, `rgba(${rgb},.16)`], [1, `rgba(${rgb},0)`]);
      g.fillRect(0, 0, 64, 64);
    })));
  return cv;
}
function glow(ctx: C2, rgb: string, x: number, y: number, r: number, a: number) {
  if (a <= 0.01 || r < 1) return;
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(glowSpr(rgb), x - r, y - r, r * 2, r * 2);
}

// ── 글자: 한 번 구워 찍기 (느린 폰) ──
const GLY = new Map<string, HTMLCanvasElement>();
function txt(ctx: C2, str: string, x: number, y: number, px: number, wgt: number, fill: string, stroke = '', lw = 0, align: 'center' | 'left' | 'right' = 'center') {
  const sc = devScale(ctx), size = Math.max(12, Math.round(px)), key = `${str}|${size}|${wgt}|${fill}|${stroke}|${lw}|${sc}`;
  let cv = GLY.get(key);
  if (!cv) {
    if (GLY.size > 220) GLY.clear();
    const font = `${wgt} ${size}px system-ui, sans-serif`;
    const probe = document.createElement('canvas').getContext('2d')!;
    probe.font = font;
    const tw = Math.ceil(probe.measureText(str).width + lw * 2 + 4), th = Math.ceil(size * 1.35 + lw * 2);
    cv = layer(tw * sc, th * sc, (g) => {
      g.scale(sc, sc);
      g.font = font;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      if (lw > 0) (g.lineWidth = lw), (g.strokeStyle = stroke), g.strokeText(str, tw / 2, th / 2);
      g.fillStyle = fill;
      g.fillText(str, tw / 2, th / 2);
    });
    GLY.set(key, cv);
  }
  const cw = cv.width / sc, ch = cv.height / sc, ox = align === 'center' ? cw / 2 : align === 'left' ? 0 : cw;
  ctx.drawImage(cv, x - ox, y - ch / 2, cw, ch);
  return cw;
}
/** 숫자 글자 하나 굽기 (숫자 크기·색은 몇 가지로만 — 굽는 수를 묶어 둔다) */
const DIG = new Map<string, HTMLCanvasElement>();
function glyph(ch: string, size: number, fill: string, stroke: string, lw: number, sc: number) {
  const key = `${ch}|${size}|${fill}|${stroke}|${lw}|${sc}`;
  let cv = DIG.get(key);
  if (!cv) {
    if (DIG.size > 400) DIG.clear();
    const font = `900 ${size}px system-ui, sans-serif`;
    const probe = document.createElement('canvas').getContext('2d')!;
    probe.font = font;
    const tw = Math.ceil(probe.measureText(ch).width + lw * 2), th = Math.ceil(size * 1.3 + lw * 2);
    cv = layer(tw * sc, th * sc, (g) => {
      g.scale(sc, sc);
      g.font = font;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      if (lw > 0) (g.lineWidth = lw), (g.strokeStyle = stroke), g.strokeText(ch, tw / 2, th / 2);
      g.fillStyle = fill;
      g.fillText(ch, tw / 2, th / 2);
    });
    DIG.set(key, cv);
  }
  return cv;
}
/** 숫자 문자열: 글자 하나씩 이어 붙인다 (점수가 매 프레임 바뀌어도 새로 굽지 않게) */
function num(ctx: C2, str: string, x: number, y: number, px: number, fill: string, stroke = '#1a0f33', lw = 3, align: 'center' | 'left' | 'right' = 'center', scale = 1) {
  const sc = devScale(ctx), size = Math.max(12, Math.round(px));
  let tot = 0;
  for (const ch of str) tot += glyph(ch, size, fill, stroke, lw, sc).width / sc - lw * 1.2;
  tot *= scale;
  let cx = align === 'center' ? x - tot / 2 : align === 'left' ? x : x - tot;
  for (const ch of str) {
    const cv = glyph(ch, size, fill, stroke, lw, sc), cw = (cv.width / sc) * scale, chh = (cv.height / sc) * scale;
    ctx.drawImage(cv, cx - lw * 0.6 * scale, y - chh / 2, cw, chh);
    cx += cw - lw * 1.2 * scale;
  }
}
/** 숫자 글자 모양: [크기, 색, 테 색, 테 굵기] — 이것만 쓴다 */
const N_POP: [number, string, string, number] = [15, '#ffffff', '#1a0f33', 3];
const N_HUD: [number, string, string, number] = [26, '#ffe27a', '#1a0f33', 4], N_BADGE: [number, string, string, number] = [24, '#ffe066', '#1a0f33', 4];
const N_RES: [number, string, string, number] = [44, '#ffe27a', '#2a1040', 6];
const numS = (ctx: C2, str: string, x: number, y: number, st: [number, string, string, number], scale = 1) => num(ctx, str, x, y, st[0], st[1], st[2], st[3], 'center', scale);

// ── 미리 굽기: 그림 프레임 밖(setTimeout)에서 조금씩 — 놀이 중 한 프레임이 길어지지 않게 ──
const WQ: (() => void)[] = [], WK = new Set<string>();
let pumping = false;
function want(key: string, make: () => void) {
  if (WK.has(key)) return;
  WK.add(key);
  WQ.push(make);
}
function pump() {
  if (pumping || !WQ.length || typeof setTimeout !== 'function') return;
  pumping = true;
  const go = () => {
    const a = performance.now();
    while (WQ.length && performance.now() - a < 5) WQ.shift()!();
    if (WQ.length) setTimeout(go, 20);
    else pumping = false;
  };
  setTimeout(go, 30);
}
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

// ── 등불 그림 (단위: 등불 반지름 = 1, 가운데 = (0,0)) ──
const F_L: Frame = { w: 3.0, h: 3.5, ox: 1.5, oy: 1.55 }, F_LONG: Frame = { w: 4.1, h: 2.7, ox: 2.05, oy: 1.15 }, F_FISH: Frame = { w: 3.7, h: 2.7, ox: 1.85, oy: 1.35 };
const F_MUM: Frame = { w: 3.4, h: 3.8, ox: 1.7, oy: 1.75 }, F_HEAD: Frame = { w: 3.2, h: 3.0, ox: 1.6, oy: 1.5 };
const frameOf = (k: Kind) => (k === 'long' ? F_LONG : k === 'fish' ? F_FISH : k === 'mum' ? F_MUM : k === 'dragon' ? F_HEAD : F_L);
const ROUND_COL = [['#ff5146', '#c81d33', '#ffb35a'], ['#ff8a2a', '#d9531a', '#ffd06a'], ['#ff5c9a', '#c92a6b', '#ffb0d0']];
/** 얼굴: 0 방긋(눈 감은 웃음) · 1 헉(동그란 눈, 오 입) */
function face(g: C2, x: number, y: number, s: number, f: number) {
  g.strokeStyle = '#5a1a1a';
  g.lineWidth = 0.09 * s;
  if (f === 0) {
    for (const d of [-1, 1]) {
      g.beginPath();
      g.arc(x + d * 0.3 * s, y, 0.13 * s, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
    }
    g.beginPath();
    g.arc(x, y + 0.12 * s, 0.13 * s, 0.15 * Math.PI, 0.85 * Math.PI);
    g.stroke();
  } else {
    for (const d of [-1, 1]) {
      ell(g, x + d * 0.3 * s, y - 0.02 * s, 0.14 * s, 0.17 * s);
      g.fillStyle = '#fff';
      g.fill();
      g.stroke();
      ell(g, x + d * 0.3 * s, y + 0.01 * s, 0.07 * s, 0.09 * s);
      g.fillStyle = '#3a0f14';
      g.fill();
    }
    ell(g, x, y + 0.27 * s, 0.1 * s, 0.13 * s);
    g.fillStyle = '#6a1420';
    g.fill();
  }
  for (const d of [-1, 1]) {
    ell(g, x + d * 0.52 * s, y + 0.16 * s, 0.13 * s, 0.08 * s);
    g.fillStyle = 'rgba(255,90,110,.45)';
    g.fill();
  }
}
function paintRound(g: C2, f: number, col: number) {
  const [c, d, l] = ROUND_COL[col];
  g.strokeStyle = '#ffcf4a';
  g.lineWidth = 0.08;
  g.beginPath();
  g.moveTo(0, 0.95);
  g.lineTo(0, 1.38);
  g.stroke();
  ell(g, 0, 1.42, 0.09, 0.12);
  ink(g, '#ffcf4a', 0.05);
  ell(g, 0, 0, 1, 0.9);
  ink(g, radg(g, -0.25, -0.3, 0.05, 1.15, [0, '#fff6c8'], [0.3, l], [0.72, c], [1, d]));
  g.save();
  ell(g, 0, 0, 1, 0.9);
  g.clip();
  g.strokeStyle = 'rgba(120,20,30,.35)';
  g.lineWidth = 0.07;
  for (const k of [0.38, 0.75]) for (const sgn of [-1, 1]) (g.beginPath(), g.ellipse(0, 0, k, 0.9, 0, sgn > 0 ? -Math.PI / 2 : Math.PI / 2, sgn > 0 ? Math.PI / 2 : Math.PI * 1.5), g.stroke());
  g.restore();
  for (const yy of [-1.02, 0.8]) (rr(g, -0.48, yy, 0.96, 0.22, 0.07), ink(g, lin(g, 0, yy, 0, yy + 0.22, [0, '#ffe58a'], [1, '#d99a1a']), 0.06));
  shine(g, -0.45, -0.38, 0.22, 0.12, -0.6);
  face(g, 0, 0.05, 1, f);
}
function paintLong(g: C2, f: number) {
  for (const sx of [-1, 1]) {
    g.strokeStyle = '#ff6a3a';
    g.lineWidth = 0.08;
    g.beginPath();
    g.moveTo(sx * 1.45, 0.5);
    g.lineTo(sx * 1.5, 1.05);
    g.stroke();
  }
  rr(g, -1.62, -0.62, 3.24, 1.24, 0.62);
  ink(g, lin(g, 0, -0.62, 0, 0.62, [0, '#fff4b0'], [0.35, '#ffd84a'], [0.8, '#f2a91c'], [1, '#c97a10']));
  g.save();
  rr(g, -1.62, -0.62, 3.24, 1.24, 0.62);
  g.clip();
  g.strokeStyle = 'rgba(150,80,10,.32)';
  g.lineWidth = 0.07;
  for (const x of [-1.05, -0.55, 0.55, 1.05]) (g.beginPath(), g.moveTo(x, -0.7), g.quadraticCurveTo(x * 1.08, 0, x, 0.7), g.stroke());
  g.restore();
  for (const sx of [-1, 1]) (rr(g, sx > 0 ? 1.42 : -1.72, -0.42, 0.3, 0.84, 0.1), ink(g, '#e2452f', 0.06));
  shine(g, -0.7, -0.32, 0.45, 0.1, 0);
  face(g, 0, 0.0, 0.85, f);
}
function paintSwirl(g: C2, f: number) {
  // 머리 위 바람개비
  g.strokeStyle = '#ffd34a';
  g.lineWidth = 0.08;
  g.beginPath();
  g.moveTo(0, -0.9);
  g.lineTo(0, -1.2);
  g.stroke();
  const pc = ['#ff6fa5', '#5ad7ff', '#ffd34a', '#8cf06a'];
  for (let i = 0; i < 4; i++) {
    g.save();
    g.translate(0, -1.25);
    g.rotate((i * TAU) / 4);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0.32, -0.05);
    g.lineTo(0.05, -0.3);
    g.closePath();
    ink(g, pc[i], 0.04);
    g.restore();
  }
  ell(g, 0, 0, 1, 0.92);
  ink(g, radg(g, -0.25, -0.3, 0.05, 1.15, [0, '#fbe8ff'], [0.35, '#c79aff'], [0.75, '#8a52f0'], [1, '#5a2ab8']));
  g.save();
  ell(g, 0, 0, 1, 0.92);
  g.clip();
  g.strokeStyle = 'rgba(255,240,255,.55)';
  g.lineWidth = 0.13;
  g.beginPath();
  for (let a = 0; a < TAU * 2.2; a += 0.15) {
    const r = 0.08 + a * 0.075;
    const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.92;
    if (a) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.stroke();
  g.restore();
  shine(g, -0.45, -0.4, 0.2, 0.11, -0.6);
  face(g, 0, 0.12, 0.9, f);
}
function paintSplit(g: C2, f: number) {
  const balls: [number, number, number, string, string][] = [[-0.62, 0.36, 0.5, '#5af0c8', '#14a88a'], [0.62, 0.36, 0.5, '#7ae0ff', '#1a8ec8'], [0, -0.12, 0.64, '#8af5d8', '#18b894']];
  g.strokeStyle = '#ffe28a';
  g.lineWidth = 0.06;
  g.beginPath();
  for (const [x, y] of balls) (g.moveTo(0, -1.0), g.lineTo(x, y));
  g.stroke();
  ell(g, 0, -1.02, 0.13, 0.1);
  ink(g, '#ffcf4a', 0.05);
  for (const [x, y, r, c, d] of balls) {
    ell(g, x, y, r, r * 0.94);
    ink(g, radg(g, x - r * 0.3, y - r * 0.35, r * 0.05, r * 1.15, [0, '#f2fff9'], [0.45, c], [1, d]), 0.08);
    shine(g, x - r * 0.42, y - r * 0.4, r * 0.24, r * 0.13, -0.6);
  }
  face(g, 0, -0.08, 0.62, f);
  face(g, -0.62, 0.42, 0.4, f);
  face(g, 0.62, 0.42, 0.4, f);
}
function paintFish(g: C2, f: number) {
  // 꼬리
  g.beginPath();
  g.moveTo(-0.95, 0);
  g.quadraticCurveTo(-1.5, -0.75, -1.75, -0.55);
  g.quadraticCurveTo(-1.45, 0, -1.75, 0.55);
  g.quadraticCurveTo(-1.5, 0.75, -0.95, 0);
  ink(g, lin(g, -1.7, 0, -0.9, 0, [0, '#ff7a2a'], [1, '#ffd08a']));
  // 등지느러미
  g.beginPath();
  g.moveTo(-0.3, -0.55);
  g.quadraticCurveTo(0.1, -1.05, 0.45, -0.55);
  ink(g, '#ff8a3a', 0.07);
  ell(g, 0, 0, 1.2, 0.62);
  ink(g, radg(g, 0.2, -0.15, 0.05, 1.3, [0, '#fffaf0'], [0.55, '#fff0dc'], [1, '#f2b58a']));
  g.save();
  ell(g, 0, 0, 1.2, 0.62);
  g.clip();
  for (const [x, y, r] of [[-0.35, -0.3, 0.38], [0.35, 0.35, 0.3], [-0.75, 0.25, 0.25]] as const) (ell(g, x, y, r, r * 0.8), (g.fillStyle = '#ff6a2a'), g.fill());
  g.strokeStyle = 'rgba(200,90,40,.35)';
  g.lineWidth = 0.05;
  for (let i = 0; i < 4; i++) (g.beginPath(), g.arc(-0.4 + i * 0.3, 0, 0.25, -0.9, 0.9), g.stroke());
  g.restore();
  // 아래 지느러미
  g.beginPath();
  g.moveTo(0.1, 0.5);
  g.quadraticCurveTo(0.0, 0.95, 0.45, 0.62);
  ink(g, '#ff9a4a', 0.06);
  // 눈
  ell(g, 0.68, -0.1, f ? 0.2 : 0.16, f ? 0.22 : 0.16);
  ink(g, '#fff', 0.06, '#5a1a1a');
  ell(g, 0.72, -0.08, 0.08, 0.1);
  g.fillStyle = '#2a0f14';
  g.fill();
  g.beginPath();
  if (f) (ell(g, 1.08, 0.12, 0.09, 0.12), (g.fillStyle = '#6a1420'), g.fill());
  else (g.arc(1.0, 0.1, 0.12, 0.2, 1.4), (g.strokeStyle = '#5a1a1a'), (g.lineWidth = 0.07), g.stroke());
  shine(g, 0.1, -0.38, 0.35, 0.08, 0);
}
function paintCandy(g: C2, f: number) {
  g.lineJoin = 'round';
  starPath(g, 0, 0.05, 1.12, 0.55);
  g.lineWidth = 0.32;
  g.strokeStyle = '#c93f8f';
  g.stroke();
  starPath(g, 0, 0.05, 1.12, 0.55);
  g.fillStyle = lin(g, 0, -1, 0, 1, [0, '#ffe2f4'], [0.45, '#ff9ad6'], [1, '#e85aab']);
  g.fill();
  g.lineWidth = 0.18;
  g.strokeStyle = '#ffb8e3';
  g.stroke();
  for (const [x, y] of [[-0.35, -0.35], [0.4, 0.25], [-0.2, 0.45]] as const) (starPath(g, x, y, 0.1, 0.4), (g.fillStyle = '#fff'), g.fill());
  face(g, 0, 0.12, 0.78, f);
}
function paintMum(g: C2, f: number) {
  // 왕관 뚜껑 · 술
  g.strokeStyle = '#ffcf4a';
  g.lineWidth = 0.08;
  for (const x of [-0.3, 0, 0.3]) (g.beginPath(), g.moveTo(x, 0.95), g.lineTo(x * 1.2, 1.55), g.stroke());
  ell(g, 0, 0, 1.05, 1.0);
  ink(g, radg(g, -0.25, -0.3, 0.05, 1.2, [0, '#fffbe0'], [0.35, '#ffe27a'], [0.75, '#ffb41a'], [1, '#d9800a']), 0.1);
  g.save();
  ell(g, 0, 0, 1.05, 1.0);
  g.clip();
  for (let i = 0; i < 14; i++) {
    const a = (i * TAU) / 14;
    ell(g, Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0.42, 0.13, a);
    g.fillStyle = i % 2 ? 'rgba(255,255,230,.55)' : 'rgba(255,140,40,.35)';
    g.fill();
  }
  g.restore();
  g.beginPath();
  g.moveTo(-0.55, -0.92);
  g.lineTo(-0.45, -1.35);
  g.lineTo(-0.22, -1.08);
  g.lineTo(0, -1.42);
  g.lineTo(0.22, -1.08);
  g.lineTo(0.45, -1.35);
  g.lineTo(0.55, -0.92);
  g.closePath();
  ink(g, lin(g, 0, -1.4, 0, -0.9, [0, '#fff3a0'], [1, '#e8a81a']), 0.07);
  for (const x of [-0.45, 0, 0.45]) (ell(g, x, x ? -1.32 : -1.42, 0.07, 0.07), (g.fillStyle = '#ff5a8a'), g.fill());
  shine(g, -0.48, -0.42, 0.26, 0.13, -0.6);
  face(g, 0, 0.12, 1.05, f);
}
function paintDragonHead(g: C2, f: number) {
  // 뿔 · 수염
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(s * 0.35, -0.7);
    g.quadraticCurveTo(s * 0.7, -1.35, s * 0.25, -1.4);
    g.quadraticCurveTo(s * 0.45, -1.0, s * 0.12, -0.75);
    ink(g, '#ffd34a', 0.06);
    g.strokeStyle = '#ffe9a0';
    g.lineWidth = 0.07;
    g.beginPath();
    g.moveTo(s * 0.55, 0.35);
    g.quadraticCurveTo(s * 1.25, 0.3, s * 1.4, 0.75);
    g.stroke();
  }
  ell(g, 0, 0, 0.95, 0.85);
  ink(g, radg(g, -0.2, -0.3, 0.05, 1.1, [0, '#ffb0a0'], [0.4, '#ff4a3a'], [1, '#b8142a']), 0.1);
  // 갈기
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) (ell(g, s * (0.85 + i * 0.05), -0.3 + i * 0.35, 0.22, 0.14, s * 0.6), ink(g, '#4ad08a', 0.05));
  // 주둥이
  ell(g, 0, 0.38, 0.55, 0.36);
  ink(g, '#ffd9a0', 0.07);
  for (const s of [-1, 1]) (ell(g, s * 0.18, 0.3, 0.06, 0.05), (g.fillStyle = '#7a2a1a'), g.fill());
  if (f) (ell(g, 0, 0.55, 0.2, 0.13), (g.fillStyle = '#6a1420'), g.fill());
  else (g.beginPath(), g.arc(0, 0.45, 0.2, 0.2, Math.PI - 0.2), (g.strokeStyle = '#7a2a1a'), (g.lineWidth = 0.07), g.stroke());
  for (const s of [-1, 1]) {
    ell(g, s * 0.36, -0.22, 0.2, 0.22);
    ink(g, '#fff', 0.06);
    ell(g, s * 0.36 + 0.03, -0.18, 0.09, 0.12);
    g.fillStyle = '#1a0a0a';
    g.fill();
  }
  shine(g, -0.4, -0.55, 0.2, 0.09, -0.5);
}
function lanSpr(k: Kind, f: number, col: number, px: number) {
  return spr(`L${k}${f}${k === 'round' ? col : 0}`, frameOf(k), px, (g) => {
    if (k === 'round') paintRound(g, f, col);
    else if (k === 'long') paintLong(g, f);
    else if (k === 'swirl') paintSwirl(g, f);
    else if (k === 'split') paintSplit(g, f);
    else if (k === 'fish') paintFish(g, f);
    else if (k === 'candy') paintCandy(g, f);
    else if (k === 'mum') paintMum(g, f);
    else paintDragonHead(g, f);
  });
}
/** 등불이 내는 빛 색 */
const LGLOW: Record<Kind, string> = { round: '255,150,80', long: '255,210,90', swirl: '190,140,255', split: '110,240,200', fish: '255,170,100', candy: '255,140,210', mum: '255,210,90', dragon: '255,110,80' };
/** 불꽃 색: [꼬리 rgb, 머리 색] 둘 */
const BCOL: Record<BK, [string, string][]> = {
  ember: [['255,236,170', '#fff7dc'], ['255,200,120', '#fff0c0']],
  round: [['255,96,70', '#ffd7a8'], ['255,170,70', '#fff0b8']],
  long: [['255,214,80', '#fffbe0'], ['255,180,60', '#fff4c0']],
  swirl: [['178,120,255', '#efe2ff'], ['90,210,255', '#e0f8ff']],
  split: [['80,240,190', '#e4fff6'], ['120,220,255', '#e8faff']],
  mini: [['90,245,200', '#f0fff9'], ['150,230,255', '#f0fbff']],
  fish: [['255,150,70', '#fff0d0'], ['255,220,160', '#ffffff']],
  splash: [['140,220,255', '#ffffff'], ['90,170,255', '#e8f6ff']],
  candy: [['255,130,210', '#fff0fa'], ['255,230,120', '#fffbe8']],
  mum: [['255,200,80', '#fff8d8'], ['255,240,170', '#ffffff']],
  dragon: [['255,90,80', '#ffe0d0'], ['110,240,150', '#eaffef']],
  show: [['255,120,170', '#ffe8f2'], ['120,200,255', '#eaf6ff']],
};
const SHOW_COL: [string, string][] = [['255,120,170', '#ffe8f2'], ['120,200,255', '#eaf6ff'], ['255,210,90', '#fffbe0'], ['140,255,160', '#efffef']];
const ROUND_BCOL: [string, string][] = [['255,90,70', '#ffd3b0'], ['255,160,60', '#fff0b0'], ['255,100,170', '#ffd8ee']];
const burstRgb = (b: Burst) => (b.k === 'round' ? ROUND_BCOL[b.col % 3] : b.k === 'show' ? SHOW_COL[b.col % 4] : BCOL[b.k][0])[0];
/** 불꽃 알갱이 수 (모양마다) */
const SPK: Record<BK, number> = { ember: 18, round: 26, long: 24, swirl: 26, split: 12, mini: 12, fish: 10, splash: 22, candy: 25, mum: 52, dragon: 34, show: 32 };

// ── 화면 단위 스티커: 손 · 별 · 아이 · 배 · 구경꾼 ──
function paintHand(g: C2) {
  g.save();
  g.rotate(-0.35);
  // 손가락(위로) + 주먹
  rr(g, -0.17, -1.05, 0.34, 0.95, 0.17);
  ink(g, '#fff1e0', 0.08, '#3a2440');
  rr(g, -0.5, -0.3, 1.0, 0.85, 0.32);
  ink(g, '#fff1e0', 0.08, '#3a2440');
  g.strokeStyle = 'rgba(120,80,90,.5)';
  g.lineWidth = 0.05;
  for (const x of [-0.17, 0.17]) (g.beginPath(), g.moveTo(x, -0.1), g.lineTo(x, 0.15), g.stroke());
  rr(g, -0.38, 0.5, 0.76, 0.3, 0.1);
  ink(g, '#ff7a5a', 0.07, '#3a2440');
  g.restore();
}
const F_HAND: Frame = { w: 2.4, h: 2.4, ox: 1.1, oy: 1.2 };
function paintStar(g: C2, on: boolean) {
  starPath(g, 0, 0, 1, 0.5);
  ink(g, on ? lin(g, 0, -1, 0, 1, [0, '#fff3a0'], [1, '#ffb11a']) : 'rgba(60,60,120,.55)', 0.12, on ? '#8a4a10' : 'rgba(170,170,230,.5)');
  if (on) shine(g, -0.25, -0.35, 0.22, 0.12, -0.5, 0.7);
}
const F_STAR: Frame = { w: 2.4, h: 2.4, ox: 1.2, oy: 1.2 };
/** 꼬마(배 위, 단위 = 앉은키): 0 올려다봄 · 1 던짐 · 2 와아 · 3 시무룩 */
function paintKid(g: C2, pose: number) {
  const skin = '#ffd9b8';
  // 몸(노란 비옷)
  rr(g, -0.32, -0.55, 0.64, 0.6, 0.25);
  ink(g, lin(g, 0, -0.55, 0, 0.05, [0, '#ffe06a'], [1, '#f2a91c']), 0.06);
  // 팔
  g.strokeStyle = '#f2b11c';
  g.lineWidth = 0.17;
  const arms: [number, number][] = pose === 0 ? [[-0.45, -0.75], [0.48, -0.2]] : pose === 1 ? [[-0.35, -0.2], [0.55, -1.05]] : pose === 2 ? [[-0.6, -1.0], [0.6, -1.0]] : [[-0.5, -0.1], [0.5, -0.1]];
  for (const [i, [ax, ay]] of arms.entries()) {
    const sx = i ? 0.25 : -0.25;
    g.beginPath();
    g.moveTo(sx, -0.42);
    g.lineTo(ax, ay);
    g.stroke();
    ell(g, ax, ay, 0.09, 0.09);
    ink(g, skin, 0.04);
  }
  // 불꽃 막대(왼손)
  if (pose === 0 || pose === 3) {
    const [ax, ay] = arms[0];
    g.strokeStyle = '#7a5a3a';
    g.lineWidth = 0.05;
    g.beginPath();
    g.moveTo(ax, ay);
    g.lineTo(ax - 0.12, ay - 0.42);
    g.stroke();
  }
  // 머리
  ell(g, 0, -0.85, 0.36, 0.34);
  ink(g, skin, 0.06);
  // 모자(빨간 털모자)
  g.beginPath();
  g.ellipse(0, -0.92, 0.38, 0.32, 0, Math.PI, TAU);
  g.closePath();
  ink(g, '#ff5a4a', 0.06);
  ell(g, 0, -1.26, 0.1, 0.1);
  ink(g, '#fff', 0.05);
  rr(g, -0.39, -0.97, 0.78, 0.1, 0.05);
  ink(g, '#fff', 0.04);
  // 얼굴 (위를 올려다봄)
  g.fillStyle = '#2a1430';
  g.strokeStyle = '#2a1430';
  g.lineWidth = 0.05;
  if (pose === 2) for (const d of [-1, 1]) (ell(g, d * 0.13, -0.84, 0.06, 0.08), g.fill());
  else if (pose === 3) for (const d of [-1, 1]) (g.beginPath(), g.moveTo(d * 0.18, -0.82), g.lineTo(d * 0.07, -0.82), g.stroke());
  else for (const d of [-1, 1]) (ell(g, d * 0.13, -0.86, 0.045, 0.06), g.fill());
  if (pose === 2 || pose === 1) (ell(g, 0, -0.72, 0.07, pose === 2 ? 0.08 : 0.05), (g.fillStyle = '#7a1a2a'), g.fill());
  else (g.beginPath(), g.arc(0, -0.76, 0.07, 0.2, Math.PI - 0.2), g.stroke());
  for (const d of [-1, 1]) (ell(g, d * 0.22, -0.76, 0.06, 0.035), (g.fillStyle = 'rgba(255,100,120,.5)'), g.fill());
}
const F_KID: Frame = { w: 1.8, h: 1.8, ox: 0.9, oy: 1.45 };
/** 배(단위 = 배 반폭) */
function paintBoat(g: C2) {
  g.beginPath();
  g.moveTo(-1, -0.25);
  g.quadraticCurveTo(-0.95, 0.32, -0.55, 0.35);
  g.lineTo(0.6, 0.35);
  g.quadraticCurveTo(1.0, 0.3, 1.08, -0.3);
  g.closePath();
  ink(g, lin(g, 0, -0.3, 0, 0.35, [0, '#c9824a'], [1, '#7a4220']), 0.05);
  g.strokeStyle = 'rgba(70,30,10,.5)';
  g.lineWidth = 0.025;
  for (const y of [-0.05, 0.12]) (g.beginPath(), g.moveTo(-0.95, y), g.lineTo(1.0, y - 0.03), g.stroke());
  rr(g, -1.04, -0.32, 2.16, 0.09, 0.04);
  ink(g, '#e8a868', 0.04);
  // 불씨 단지(뱃머리)
  rr(g, 0.5, -0.5, 0.36, 0.26, 0.07);
  ink(g, lin(g, 0, -0.5, 0, -0.24, [0, '#6a5a7a'], [1, '#3a2a4a']), 0.04);
}
const F_BOAT: Frame = { w: 2.4, h: 1.2, ox: 1.15, oy: 0.65 };
/** 구경꾼(단위 = 키, 발 = (0,0)): 종류 0 빨간 모자 아이 · 1 할아버지 · 2 강아지 · 3 양 갈래 소녀 · 4 고양이 · 5 엄마와 아기 / 자세 0 올려다봄 · 1 만세 · 2 펄쩍 */
function paintFan(g: C2, k: number, pose: number) {
  const skin = '#ffd6b0', up = pose > 0;
  const armUp = (sx: number, col: string) => {
    g.strokeStyle = col;
    g.lineWidth = 0.12;
    g.beginPath();
    g.moveTo(sx * 0.15, -0.52);
    if (up) g.lineTo(sx * (pose === 2 ? 0.42 : 0.3), -0.98);
    else g.lineTo(sx * 0.26, -0.22);
    g.stroke();
  };
  const mouth = (y: number) => {
    if (up) (ell(g, 0, y, 0.05, 0.06), (g.fillStyle = '#7a1a2a'), g.fill());
    else (g.beginPath(), g.arc(0, y - 0.02, 0.05, 0.2, Math.PI - 0.2), (g.strokeStyle = '#2a1430'), (g.lineWidth = 0.035), g.stroke());
  };
  const eyes = (y: number, dx = 0.08) => {
    g.fillStyle = '#2a1430';
    for (const d of [-1, 1]) (ell(g, d * dx, y, 0.03, pose === 2 ? 0.045 : 0.035), g.fill());
  };
  if (k === 2 || k === 4) {
    // 강아지 · 고양이 (앉아서 올려다봄, 펄쩍)
    const c = k === 2 ? '#fff4e8' : '#ffa64a', d = k === 2 ? '#c48a5a' : '#d9772b';
    ell(g, 0, -0.22, 0.26, 0.24);
    ink(g, c, 0.05);
    ell(g, 0.02, -0.55, 0.24, 0.21);
    ink(g, c, 0.05);
    if (k === 2) for (const s of [-1, 1]) (ell(g, s * 0.22, -0.55, 0.08, 0.15, s * 0.3), ink(g, d, 0.04));
    else for (const s of [-1, 1]) (g.beginPath(), g.moveTo(s * 0.08, -0.72), g.lineTo(s * 0.2, -0.86), g.lineTo(s * 0.22, -0.66), g.closePath(), ink(g, d, 0.04));
    eyes(-0.58, 0.08);
    ell(g, 0.02, -0.5, 0.04, 0.03);
    g.fillStyle = '#3a1a1a';
    g.fill();
    mouth(-0.43);
    g.strokeStyle = d;
    g.lineWidth = 0.07;
    g.beginPath();
    g.moveTo(0.22, -0.15);
    g.quadraticCurveTo(0.42, up ? -0.55 : -0.3, 0.36, up ? -0.62 : -0.38);
    g.stroke();
    return;
  }
  const body = ['#ff5a4a', '#7a8ab8', '', '#ff8ac8', '', '#5ac08a'][k];
  armUp(-1, body);
  armUp(1, body);
  rr(g, -0.2, -0.6, 0.4, 0.6, 0.16);
  ink(g, body, 0.05);
  ell(g, 0, -0.78, 0.2, 0.19);
  ink(g, skin, 0.05);
  if (k === 0) (g.beginPath(), g.ellipse(0, -0.82, 0.21, 0.18, 0, Math.PI, TAU), g.closePath(), ink(g, '#ffcf3a', 0.04));
  if (k === 1) {
    rr(g, -0.24, -0.98, 0.48, 0.07, 0.03);
    ink(g, '#5a4a3a', 0.03);
    rr(g, -0.15, -1.08, 0.3, 0.12, 0.04);
    ink(g, '#5a4a3a', 0.03);
    g.strokeStyle = '#fff';
    g.lineWidth = 0.05;
    g.beginPath();
    g.moveTo(-0.1, -0.7);
    g.quadraticCurveTo(0, -0.66, 0.1, -0.7);
    g.stroke();
  }
  if (k === 3) for (const s of [-1, 1]) (ell(g, s * 0.22, -0.75, 0.07, 0.11), ink(g, '#6a3a2a', 0.03));
  if (k === 5) {
    g.beginPath();
    g.ellipse(0, -0.84, 0.21, 0.18, 0, Math.PI, TAU);
    g.closePath();
    ink(g, '#4a2a3a', 0.03);
    ell(g, 0.16, -0.42, 0.1, 0.1);
    ink(g, skin, 0.03);
  }
  eyes(-0.79);
  mouth(-0.69);
}
const F_FAN: Frame = { w: 1.2, h: 1.25, ox: 0.6, oy: 1.12 };
/** 달 (단위 = 반지름): 0 초승 · 1 반달 넘음 · 2 보름 */
function paintMoon(g: C2, ph: number) {
  g.fillStyle = radg(g, 0, 0, 0, 3.2, [0, 'rgba(255,240,200,.35)'], [0.35, 'rgba(255,240,200,.1)'], [1, 'rgba(255,240,200,0)']);
  g.fillRect(-3.2, -3.2, 6.4, 6.4);
  ell(g, 0, 0, 1, 1);
  g.fillStyle = radg(g, -0.3, -0.3, 0, 1.1, [0, '#fffdf0'], [1, '#f2dfa8']);
  g.fill();
  g.fillStyle = 'rgba(200,180,130,.45)';
  for (const [dx, dy, r] of [[-0.3, 0.2, 0.18], [0.25, -0.2, 0.13], [0.15, 0.4, 0.1]] as const) (ell(g, dx, dy, r, r), g.fill());
  if (ph < 2) {
    g.save();
    ell(g, 0, 0, 1.02, 1.02);
    g.clip();
    ell(g, ph === 0 ? -0.55 : -1.25, -0.1, 1.05, 1.05);
    g.fillStyle = 'rgba(20,26,90,.93)';
    g.fill();
    g.restore();
  }
}
const F_MOON: Frame = { w: 6.4, h: 6.4, ox: 3.2, oy: 3.2 };

// ── 배경 (화면마다 한 장) ──
/** 마을 집: x · 폭 · 벽 높이 · 지붕 높이 (화면 폭 단위, 바닥 = 수면) */
const HOUSES: [number, number, number, number][] = [[0.06, 0.13, 0.05, 0.035], [0.19, 0.11, 0.075, 0.04], [0.32, 0.12, 0.045, 0.03], [0.47, 0.1, 0.1, 0.05], [0.61, 0.12, 0.05, 0.035], [0.75, 0.12, 0.068, 0.04], [0.9, 0.14, 0.05, 0.035]];
/** 구경꾼: 종류 · x · 서 있는 높이(지붕 위 또는 물가) */
const FANS: [number, number, number][] = [[0, 0.08, HZ - 0.004], [2, 0.14, HZ - 0.003], [1, 0.19, HZ - 0.075 - 0.038], [3, 0.36, HZ - 0.004], [4, 0.61, HZ - 0.05 - 0.033], [5, 0.75, HZ - 0.068 - 0.038], [0, 0.86, HZ - 0.004], [2, 0.93, HZ - 0.003]];
const BG = new Map<string, HTMLCanvasElement>();
function bakeBg(w: number, h: number, K: number) {
  const key = `${w}x${h}@${K}`;
  let cv = BG.get(key);
  if (cv) return cv;
  if (BG.size > 4) BG.clear();
  cv = layer(w * K, h * K, (g) => {
    g.scale(K, K);
    const X = (x: number) => x * w, hz = HZ * w;
    g.fillStyle = lin(g, 0, 0, 0, hz, [0, '#0a0f38'], [0.4, '#18216a'], [0.72, '#33308a'], [0.9, '#6a4494'], [1, '#d77c8c']);
    g.fillRect(0, 0, w, hz);
    // 은하수 안개
    for (let i = 0; i < 5; i++) {
      const x = X(0.15 + i * 0.18), y = X(0.25 + Math.sin(i * 1.7) * 0.08);
      g.fillStyle = radg(g, x, y, 0, X(0.22), [0, 'rgba(150,170,255,.10)'], [1, 'rgba(150,170,255,0)']);
      g.fillRect(x - X(0.25), y - X(0.25), X(0.5), X(0.5));
    }
    // 별
    for (let i = 0; i < 150; i++) {
      const x = hsh(i) * w, y = hsh(i + 400) ** 1.3 * hz * 0.92, r = 0.4 + hsh(i + 900) * 1.1;
      g.globalAlpha = 0.35 + hsh(i + 77) * 0.6;
      g.fillStyle = i % 7 ? '#ffffff' : '#ffe6a8';
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
    // 먼 산 (두 겹)
    const ridge = (base: number, amp: number, f: number, col: string, ph: number) => {
      g.beginPath();
      g.moveTo(0, hz);
      for (let x = 0; x <= 1.0001; x += 0.02) g.lineTo(X(x), X(base - amp * (0.6 + 0.4 * Math.sin(x * f + ph)) * (0.7 + 0.3 * Math.sin(x * f * 2.7 + ph * 2))));
      g.lineTo(w, hz);
      g.closePath();
      g.fillStyle = col;
      g.fill();
    };
    ridge(HZ - 0.03, 0.12, 5.2, '#3b2f7e', 0.4);
    ridge(HZ - 0.01, 0.07, 7.3, '#2a2266', 1.9);
    // 노을빛 아지랑이
    g.fillStyle = lin(g, 0, hz - X(0.12), 0, hz, [0, 'rgba(255,150,120,0)'], [1, 'rgba(255,160,120,.28)']);
    g.fillRect(0, hz - X(0.12), w, X(0.12));
    // 나무
    for (let i = 0; i < 9; i++) {
      const x = X(0.02 + i * 0.122 + hsh(i + 30) * 0.03), r = X(0.022 + hsh(i + 60) * 0.012);
      g.fillStyle = '#1c1748';
      g.beginPath();
      g.arc(x, hz - r * 0.9, r, 0, TAU);
      g.arc(x + r * 0.7, hz - r * 0.6, r * 0.8, 0, TAU);
      g.fill();
    }
    // 집
    for (const [i, [hx, hw, wh, rh]] of HOUSES.entries()) {
      const x0 = X(hx - hw / 2), x1 = X(hx + hw / 2), yb = hz, yw = hz - X(wh), yr = yw - X(rh);
      g.fillStyle = lin(g, 0, yw, 0, yb, [0, i % 2 ? '#4a3672' : '#553a78'], [1, '#2e2152']);
      g.fillRect(x0 + X(0.006), yw, x1 - x0 - X(0.012), yb - yw);
      // 창문 (따뜻한 불빛)
      const nw = Math.max(1, Math.round(hw / 0.04));
      for (let j = 0; j < nw; j++) {
        const wx = x0 + X(0.014) + ((x1 - x0 - X(0.028)) * (j + 0.5)) / nw, wy = yw + X(wh * 0.45);
        g.fillStyle = radg(g, wx, wy, 0, X(0.03), [0, 'rgba(255,200,110,.55)'], [1, 'rgba(255,200,110,0)']);
        g.fillRect(wx - X(0.03), wy - X(0.03), X(0.06), X(0.06));
        rr(g, wx - X(0.009), wy - X(0.011), X(0.018), X(0.022), X(0.004));
        g.fillStyle = (i + j) % 3 ? '#ffd27a' : '#ffb15a';
        g.fill();
      }
      // 지붕 (처마가 살짝 들린)
      g.beginPath();
      g.moveTo(x0 - X(0.012), yw + X(0.004));
      g.quadraticCurveTo(x0 + X(0.01), yw - X(0.004), X(hx - hw * 0.28), yr);
      g.lineTo(X(hx + hw * 0.28), yr);
      g.quadraticCurveTo(x1 - X(0.01), yw - X(0.004), x1 + X(0.012), yw + X(0.004));
      g.closePath();
      g.fillStyle = lin(g, 0, yr, 0, yw, [0, '#3a2a5e'], [1, '#22183f']);
      g.fill();
      g.strokeStyle = 'rgba(255,190,140,.35)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(X(hx - hw * 0.28), yr);
      g.lineTo(X(hx + hw * 0.28), yr);
      g.stroke();
      if (i === 3) {
        // 탑: 한 층 더
        const y2 = yr - X(0.035);
        g.fillStyle = '#4a3672';
        g.fillRect(X(hx - 0.025), y2, X(0.05), yr - y2);
        g.beginPath();
        g.moveTo(X(hx - 0.045), y2 + X(0.004));
        g.lineTo(X(hx), y2 - X(0.03));
        g.lineTo(X(hx + 0.045), y2 + X(0.004));
        g.closePath();
        g.fillStyle = '#2a1d4a';
        g.fill();
        rr(g, X(hx - 0.008), y2 + X(0.008), X(0.016), X(0.018), X(0.004));
        g.fillStyle = '#ffd27a';
        g.fill();
      }
    }
    // 처마 끝에 걸린 작은 등 줄
    g.strokeStyle = 'rgba(40,20,50,.8)';
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(0, hz - X(0.03));
    for (let x = 0; x <= 1; x += 0.05) g.lineTo(X(x), hz - X(0.03) + Math.sin(x * 40) * X(0.004) + X(0.006));
    g.stroke();
    for (let x = 0.025; x < 1; x += 0.05) {
      const y = hz - X(0.024) + Math.sin(x * 40) * X(0.004);
      g.fillStyle = radg(g, X(x), y, 0, X(0.016), [0, 'rgba(255,120,90,.9)'], [1, 'rgba(255,120,90,0)']);
      g.fillRect(X(x) - X(0.016), y - X(0.016), X(0.032), X(0.032));
      g.fillStyle = (x * 20) % 2 < 1 ? '#ff6a5a' : '#ffd25a';
      g.beginPath();
      g.arc(X(x), y, X(0.006), 0, TAU);
      g.fill();
    }
    // 호수 바탕
    g.fillStyle = lin(g, 0, hz, 0, h, [0, '#262a78'], [0.4, '#151a55'], [1, '#090c30']);
    g.fillRect(0, hz, w, h - hz);
    // 마을·산·노을이 거꾸로 비친 물 (구울 때 한 번만 — 줄마다 살짝 어긋나게)
    const src = g.canvas, lh = h - hz, N = 14, sh = lh / N;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < N; i++) {
      const d0 = i * sh, sy = hz - (d0 + sh) * 1.6, ox = Math.sin(i * 1.9) * (1 + i * 0.4);
      g.setTransform(K, 0, 0, -K, K * ox, K * (2 * hz + 2 * d0 + sh));
      g.globalAlpha = 0.5 - i * 0.025;
      g.drawImage(src, 0, Math.max(0, K * sy), src.width, K * sh * 1.6, 0, hz + d0, w, sh);
    }
    g.restore();
    // 물가 선
    g.fillStyle = 'rgba(255,200,160,.25)';
    g.fillRect(0, hz - 0.5, w, 1.5);
  });
  BG.set(key, cv);
  return cv;
}
/** 호수 위 물결 덮개 (한 장) */
const LAKE = new Map<string, HTMLCanvasElement>();
function lakeLayer(w: number, h: number, K: number) {
  const key = `${w}x${h}@${K}`;
  let cv = LAKE.get(key);
  if (cv) return cv;
  if (LAKE.size > 4) LAKE.clear();
  const hz = HZ * w;
  cv = layer(w * K, (h - hz) * K, (g) => {
    g.scale(K, K);
    const lh = h - hz;
    g.fillStyle = lin(g, 0, 0, 0, lh, [0, 'rgba(20,26,90,.18)'], [0.5, 'rgba(14,18,70,.42)'], [1, 'rgba(8,10,40,.7)']);
    g.fillRect(0, 0, w, lh);
    for (let i = 0; i < 46; i++) {
      const y = (hsh(i + 5) ** 1.6) * lh, x = hsh(i + 50) * w, l = (6 + hsh(i + 90) * 26) * (0.5 + y / lh);
      g.strokeStyle = `rgba(200,210,255,${0.06 + hsh(i) * 0.12})`;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x - l / 2, y);
      g.lineTo(x + l / 2, y);
      g.stroke();
    }
  });
  LAKE.set(key, cv);
  return cv;
}

// ── 그리기 쪽 기억 (연출만 — 시뮬레이션과 무관) ──
interface Pop { x: number; y: number; str: string; big: boolean; t0: number; life: number }
type Link = [number, number, number, number, number];
interface VM { links: Link[]; multT: number; pops: Pop[]; streaks: [number, number, number][]; ripples: [number, number, number][]; flies: [number, number, number][]; shown: number; nPulse: number; bigN: number; bigT: number; resShown: number; star: number; hint: { t: number; x: number; y: number } | null; lastN: number }
const VMS = new WeakMap<object, VM>();
const vmOf = (s: FwState) => {
  let v = VMS.get(s);
  if (!v) VMS.set(s, (v = { links: [], multT: -99, pops: [], streaks: [], ripples: [], flies: [], shown: s.pts, nPulse: -99, bigN: 0, bigT: -999, resShown: 0, star: 0, hint: null, lastN: 0 }));
  return v;
};
/** 연쇄 번호 → 음 (도레미…) */
const SCALE = [0, 2, 4, 5, 7, 9, 11];
const notePitch = (n: number) => {
  const k = Math.max(0, n - 1), oct = Math.min(2, Math.floor(k / 7));
  return 0.75 * 2 ** ((SCALE[k % 7] + 12 * oct) / 12);
};
/** 꼬마 배 위치 (화면 폭 단위) */
const BOAT_X = 0.5, BOAT_Y = 1.33, POT_X = 0.62, POT_Y = 1.265;

// ── 불꽃 한 송이 (상태 없이 시간으로 계산 — 같은 틱이면 같은 그림) ──
function drawBurst(ctx: C2, b: Burst, t: number, w: number, lod: number, haze: number, rich: boolean) {
  const tau = t - b.t0;
  if (tau < 0 || tau > b.life) return;
  const L = b.life, fade = 1 - (tau / L) ** 2, cx = b.x * w, cy = b.y * w;
  const Rv = b.R * w * (1.12 + Math.min(0.3, b.n / 90));
  const cols = b.k === 'round' ? [ROUND_BCOL[b.col % 3], ROUND_BCOL[(b.col + 1) % 3]] : b.k === 'show' ? [SHOW_COL[b.col % 4], SHOW_COL[(b.col + 1) % 4]] : BCOL[b.k];
  const n = Math.max(6, Math.round(SPK[b.k] * lod));
  const tl = b.k === 'mum' ? 10 : b.k === 'swirl' ? 6 : b.k === 'dragon' ? 7 : 4;
  const grav = w * 0.000032 * (b.k === 'mum' ? 1.6 : b.k === 'splash' ? 5 : 1);
  const P = (i: number, u: number): [number, number] => {
    if (u < 0) u = 0;
    const h1 = hsh(b.seed + i * 13.1), h2 = hsh(b.seed + i * 7.7 + 3);
    let a: number, d: number;
    switch (b.k) {
      case 'long': {
        const side = i % 2 ? 1 : -1, fr = (Math.floor(i / 2) + 0.6) / Math.ceil(n / 2);
        a = (side > 0 ? 0 : Math.PI) + (h1 - 0.5) * 0.16;
        d = Rv * fr * (1 - Math.exp(-u / 7));
        return [Math.cos(a) * d, Math.sin(a) * d * 0.7 + grav * u * u];
      }
      case 'swirl': {
        a = (i / n) * TAU + 2.6 * (1 - Math.exp(-u / 18));
        d = Rv * (0.75 + 0.3 * h2) * (1 - Math.exp(-u / 15));
        return [Math.cos(a) * d, Math.sin(a) * d + grav * u * u * 0.6];
      }
      case 'splash': {
        a = -Math.PI / 2 + (h1 - 0.5) * 2.0;
        d = Rv * (0.5 + 0.7 * h2) * (1 - Math.exp(-u / 9));
        return [Math.cos(a) * d, Math.sin(a) * d + grav * u * u];
      }
      case 'candy': {
        const arm = i % 5, k = Math.floor(i / 5) + 1;
        a = -Math.PI / 2 + (arm * TAU) / 5 + (h1 - 0.5) * 0.06;
        d = Rv * (k / Math.ceil(n / 5)) * (1 - Math.exp(-u / 8));
        return [Math.cos(a) * d, Math.sin(a) * d + grav * u * u];
      }
      default: {
        a = (i / n) * TAU + (h1 - 0.5) * 0.3;
        d = Rv * (0.78 + 0.3 * h2) * (1 - Math.exp(-u / 8));
        return [Math.cos(a) * d, Math.sin(a) * d + grav * u * u];
      }
    }
  };
  // 터지는 순간의 흰 불덩이 · 색 번짐
  // (빛은 'lighter'로 더하되, 겹쳐도 하얗게 날아가지 않게 최근 것만 · 낮게)
  ctx.globalCompositeOperation = 'lighter';
  if (tau < 8 && rich) glow(ctx, '255,248,225', cx, cy, Rv * (0.4 + tau * 0.05), (1 - tau / 8) * (b.k === 'mum' ? 0.9 : 0.6) * haze);
  if (rich) glow(ctx, cols[0][0], cx, cy, Rv * 1.2, 0.18 * haze * fade * (tau < 40 ? 1 : 1 - (tau - 40) / Math.max(1, L - 40)));
  const big = b.k === 'mum' ? 1.5 : b.k === 'mini' || b.k === 'split' || b.k === 'fish' ? 0.8 : 1;
  for (let c = 0; c < 2; c++) {
    const [rgb, head] = cols[c];
    ctx.beginPath();
    for (let i = c; i < n; i += 2) {
      const [x0, y0] = P(i, tau - tl), [x1, y1] = P(i, tau);
      ctx.moveTo(cx + x0, cy + y0);
      if (b.k === 'swirl') {
        const [xm, ym] = P(i, tau - tl / 2);
        ctx.quadraticCurveTo(cx + xm, cy + ym, cx + x1, cy + y1);
      } else ctx.lineTo(cx + x1, cy + y1);
    }
    // 넓고 흐린 빛(더하기) + 가늘고 또렷한 심(덮어 그리기 — 색이 살아 있게)
    ctx.strokeStyle = `rgb(${rgb})`;
    if (rich) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.max(0, fade * 0.2 * haze);
      ctx.lineWidth = 5 * big;
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.max(0, fade * 0.92);
    ctx.lineWidth = 2 * big;
    ctx.stroke();
    ctx.fillStyle = head;
    ctx.beginPath();
    const late = tau > L * 0.55, hs = 3 * big;
    for (let i = c; i < n; i += 2) {
      if (late && hsh(b.seed + i * 3 + (tau >> 2)) < 0.45) continue;
      const [x1, y1] = P(i, tau);
      ctx.rect(cx + x1 - hs / 2, cy + y1 - hs / 2, hs, hs);
    }
    ctx.fill();
  }
}

/** 처음 그릴 때 한 번: 앞으로 쓸 스티커·빛·숫자를 굽기 줄에 (놀이 프레임 밖에서) */
const WARM = new Set<string>();
function prewarm(w: number, h: number, K: number) {
  if (WARM.has(`${w}x${h}@${K}`)) return pump();
  WARM.add(`${w}x${h}@${K}`);
  const R = (r: number) => r * w;
  want(`boat:${w}:${K}`, () => spr('boat', F_BOAT, R(0.16) * K, paintBoat));
  want(`lake${w}x${h}@${K}`, () => lakeLayer(w, h, K));
  for (const k of Object.keys(KD) as Kind[]) for (const f of [0, 1]) for (const c of k === 'round' ? [0, 1, 2] : [0]) want(`L${k}${f}${c}:${w}:${K}`, () => lanSpr(k, f, c, R(KD[k].r) * K));
  const rgbs = new Set<string>(['255,250,230', '255,240,200', '255,255,240', '255,220,120', '255,150,70', '255,190,90', '255,230,150', '170,255,220', '255,180,90', '255,140,90', '255,160,220', '255,255,255']);
  for (const v of Object.values(LGLOW)) rgbs.add(v);
  for (const v of [...Object.values(BCOL).flat(), ...SHOW_COL, ...ROUND_BCOL]) rgbs.add(v[0]);
  for (const c of rgbs) want('g' + c, () => glowSpr(c));
  for (let k = 0; k < 6; k++) for (let p = 0; p < 3; p++) want(`fan${k}${p}:${w}:${K}`, () => spr(`fan${k}${p}`, F_FAN, R(0.066) * K, (g) => paintFan(g, k, p)));
  for (let p = 0; p < 4; p++) want(`kid${p}:${w}:${K}`, () => spr(`kid${p}`, F_KID, R(0.1) * K, (g) => paintKid(g, p)));
  for (const on of [false, true]) for (const r of [0.026, 0.05]) want(`star${on}${r}:${w}:${K}`, () => spr('star' + (on ? 1 : 0), F_STAR, R(r) * K, (g) => paintStar(g, on)));
  want(`hand:${w}:${K}`, () => spr('hand', F_HAND, R(0.06) * K, paintHand));
  for (let p = 0; p < 3; p++) want(`moon${p}:${w}:${K}`, () => spr('moon' + p, F_MOON, R(0.05) * K, (g) => paintMoon(g, p)));
  for (const st of [N_POP, N_HUD, N_BADGE, N_RES]) for (const ch of '0123456789,+') want(`d${ch}${st[0]}${K}`, () => glyph(ch, st[0], st[1], st[2], st[3], K));
  pump();
}

// ═════════════════════════════ 한 장 그리기 ═════════════════════════════
function drawAll(ctx: C2, s: FwState, w: number, h: number, _th: Theme) {
  const fx = juice(s), vm = vmOf(s), t = s.t, K = devScale(ctx);
  const X = (x: number) => x * w, R = (r: number) => r * w;
  prewarm(Math.round(w), Math.round(h), K);
  // ── 사건 → 소리 · 흔들림 · 글자 ──
  const lastEv = fx.memo.ev ?? 0;
  let snd = 0;
  const sound = (n: Parameters<typeof fx.sound>[0], p = 1, v = 1) => void (snd++ < 3 && fx.sound(n, p, v));
  const pop = (x: number, y: number, str: string, big: boolean, life = 44, force = false) => {
    const near = () => vm.pops.some((q) => t - q.t0 < 20 && Math.abs(q.x - x) < 36 && Math.abs(q.y - y) < 20);
    if (!force && near()) return;
    for (let k = 0; k < 3 && near(); k++) y -= 18;
    vm.pops.push({ x, y, str, big, t0: t, life });
    if (vm.pops.length > 26) vm.pops.splice(0, vm.pops.length - 26);
  };
  for (const e of s.events) {
    if (e.id <= lastEv || t - e.t > 30) continue;
    const ex = X(e.x), ey = X(e.y);
    switch (e.k) {
      case 'tap':
        if (!e.n) sound('thud', 0.85, 0.9), sound('crack', 1.2, 0.55);
        fx.kick(3);
        fx.ring(ex, ey, '#fff0c0', R(R_EMBER), 3);
        vm.streaks.push([e.x, e.y, t]);
        break;
      case 'join': {
        // 이음! — 꺼져 가던 끝 등불에서 톡 자리로 금빛 줄, 곱 글자, 한 단계 높은 소리
        const m = e.n, up = 2 ** (((m - 1) * 2) / 12);
        sound('chime', 0.9 * up, 1.1);
        sound('thud', 1.05 * up, 1);
        sound('swell', 1.1 * up, 0.6);
        fx.kick(6 + m);
        fx.ring(ex, ey, '#ffd45a', R(JOIN_R), 6);
        fx.blink('#ffe39a', 0.07);
        vm.links.push([e.ax ?? e.x, e.ay ?? e.y, e.x, e.y, t]);
        vm.pops = vm.pops.filter((q) => !q.big);
        pop(ex, Math.max(X(0.3), ey - 26), `이음 ×${m}`, true, 44, true);
        vm.multT = t;
        break;
      }
      case 'empty':
        sound('fail', 1.5, 0.35);
        break;
      case 'burst': {
        const n = e.n, k = e.kind as Kind, up = 2 ** ((((e.ax ?? 1) - 1) * 2) / 12);
        sound('pop', notePitch(n) * up, 0.75);
        fx.kick(Math.min(6, 1.2 + n / 14));
        if (k === 'mum') sound('thud', 0.55, 1.2), sound('swell', 0.8, 1), fx.blink('#fff1c0', 0.3), fx.kick(10);
        else if (k === 'swirl') sound('whoosh', 1.4, 0.8);
        else if (k === 'split') sound('zap', 1.5, 0.6);
        else if (k === 'long') sound('crack', 1.5, 0.7);
        else if (k === 'fish') sound('whoosh', 0.7, 0.8);
        else if (k === 'dragon') sound('whoosh', 0.55, 1), sound('boing', 0.6, 0.6);
        if (n > vm.lastN) vm.nPulse = t;
        vm.lastN = n;
        break;
      }
      case 'candy':
        sound('coin', 1.2, 0.9);
        vm.flies.push([e.x, e.y, t]);
        break;
      case 'splash':
        sound('splash', 1, 1);
        fx.kick(5);
        vm.ripples.push([e.x, t, 1.4]);
        break;
      case 'dragonEnd':
        sound('thud', 0.6, 1);
        fx.blink('#ffe0c0', 0.14);
        break;
      case 'wow':
        sound('swell', 1.2, 0.7);
        break;
      case 'skyclear':
        sound('clear', 1, 1);
        fx.blink('#fff3c8', 0.22);
        fx.kick(8);
        vm.bigN = -1;
        vm.bigT = t;
        break;
      case 'chainEnd':
        vm.lastN = 0;
        break;
      case 'volley':
        if (e.n > 0) sound('whoosh', 0.6, 0.7);
        break;
      case 'bonus':
        sound('thud', 0.8, 0.8);
        sound('crack', 1, 0.6);
        break;
      case 'result':
        sound('clear', 1, 1);
        vm.resShown = 0;
        vm.star = 0;
        break;
      case 'night':
        sound('swell', 0.9, 0.7);
        vm.shown = s.pts;
        break;
    }
  }
  fx.memo.ev = s.evN;

  ctx.save();
  fx.begin(ctx);
  const ww = Math.round(w), hh = Math.round(h);
  ctx.drawImage(bakeBg(ww, hh, K), 0, 0, w, h);
  const hz = HZ * w;
  // ── 달 (하늘마다 차오름 — 모양 셋을 구워 둔다) ──
  {
    const ph = s.phase === 'play' ? Math.min(2, s.vol) : 2, mr = R(0.05);
    ctx.save();
    ctx.translate(X(0.84), X(0.17));
    stamp(ctx, spr('moon' + ph, F_MOON, mr * K, (g) => paintMoon(g, ph)), F_MOON, mr);
    ctx.restore();
  }
  // ── 반짝이는 별 몇 개 ──
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 10; i++) {
    const a = Math.sin(t * 0.05 + i * 2.1);
    if (a < 0.3) continue;
    const x = hsh(i + 1234) * w, y = hsh(i + 2345) * hz * 0.6, r = 1 + a * 1.5;
    ctx.globalAlpha = a * 0.9;
    ctx.fillRect(x - r * 1.6, y - 0.5, r * 3.2, 1);
    ctx.fillRect(x - 0.5, y - r * 1.6, 1, r * 3.2);
  }
  ctx.globalAlpha = 1;

  // ── 산 너머 먼 마을의 작은 불꽃 (세상이 늘 살아 있게 — 그림만) ──
  for (let j = 0; j < 2; j++) {
    const per = 100 + j * 37, k = Math.floor((t + j * 53) / per), u = ((t + j * 53) % per) / 46;
    if (u > 1) continue;
    const x = X(0.08 + hsh(k * 3 + j) * 0.84), y = X(0.84 + hsh(k * 5 + j) * 0.08), r = R(0.05 + hsh(k + j * 9) * 0.03) * easeOut3(u * 1.6);
    const col = SHOW_COL[(k + j) % 4];
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, col[0], x, y, r * 1.8, 0.4 * (1 - u));
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.85 * (1 - u);
    ctx.fillStyle = col[1];
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      ctx.rect(x + Math.cos(a) * r - 1, y + Math.sin(a) * r + u * u * 5 - 1, 2, 2);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // ── 하늘을 밝히는 빛 (방금 터진 불꽃) ──
  const live = s.bursts.filter((b) => t - b.t0 <= b.life);
  ctx.globalCompositeOperation = 'lighter';
  let gl = 0;
  for (let i = live.length - 1; i >= 0 && gl < 6; i--) {
    const b = live[i], tau = t - b.t0;
    if (tau > 30) continue;
    gl++;
    const col = burstRgb(b);
    glow(ctx, col, X(b.x), X(b.y), R(b.R) * (b.k === 'mum' ? 3 : 2.2), (0.22 * (1 - tau / 30) * (b.k === 'mum' ? 1.5 : 1)) / (1 + gl * 0.2));
  }
  // 등불 빛 번짐
  for (const L of s.lans) {
    const age = t - L.born;
    if (age < L.rel || L.st === 3) continue;
    const u = R(KD[L.k].r) * L.sz, fl = 0.85 + 0.15 * Math.sin(t * 0.21 + L.ph * 5);
    const hot = L.st === 1 ? 1 - (L.fuse - t) / (FUSE + 3) : 0, kindle = age - L.rel < 12 && L.rel > 0 ? 1 - (age - L.rel) / 12 : 0;
    glow(ctx, LGLOW[L.k], X(L.x), X(L.y), u * (2.5 + hot * 1.4 + kindle * 1.5), (0.42 + hot * 0.4 + kindle * 0.5) * fl);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  // ── 등불 (가까이서 터지면 휘청 — 그림만) ──
  const shocks = live.filter((b) => t - b.t0 < 24 && b.grow >= 0);
  for (const L of s.lans) {
    const age = t - L.born;
    if (age < 0) continue;
    const fr = frameOf(L.k), base = R(KD[L.k].r) * L.sz, rising = age < L.rel;
    const hot = L.st === 1 ? clamp(1 - (L.fuse - t) / (FUSE + 3), 0, 1) : 0;
    const u = base * (1 + hot * 0.28);
    const cv = lanSpr(L.k, L.st === 1 ? 1 : 0, L.col, R(KD[L.k].r) * K);
    let x = X(L.x), y = X(L.y), rot = Math.sin(L.ph + t * 0.024) * 0.12;
    for (const b of shocks) {
      const dx = L.x - b.x, dy = L.y - b.y, d = Math.hypot(dx, dy), rr2 = b.R * 2.2;
      if (d > rr2 || d < 1e-4) continue;
      const f = (1 - (t - b.t0) / 24) * (1 - d / rr2) * Math.sin(((t - b.t0) / 24) * Math.PI * 2.5);
      x += (dx / d) * R(0.014) * f;
      y += (dy / d) * R(0.014) * f;
      rot += (dx / d) * 0.25 * f;
    }
    if (hot) (x += Math.sin(t * 2.3 + L.id) * 1.4), (y += Math.cos(t * 2.9 + L.id) * 1.2), (rot += Math.sin(t * 1.7) * 0.15);
    if (L.k === 'dragon') drawDragonBody(ctx, L.x, L.y, L.dir, t, w, L.ph, 1);
    if (L.k === 'fish') rot = L.dir * 0.08 + Math.sin(t * 0.08 + L.ph) * 0.1;
    ctx.globalAlpha = rising ? 0.55 + 0.45 * (age / L.rel) : L.st === 3 ? 0.7 : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    if (L.k === 'fish' && L.dir < 0) ctx.scale(-1, 1);
    if (L.k === 'dragon' && L.dir < 0) ctx.scale(-1, 1);
    stamp(ctx, cv, fr, u);
    ctx.restore();
    // 옮겨붙은 특별한 등불: 터질 모양(닿는 범위)을 잠깐 그린다 — 모양마다 퍼짐이 다른 것이 먼저 보이게
    if (L.st === 1 && L.k !== 'round') drawZones(ctx, L, w, hot);
    // 불붙은 심지 (흰 불꽃이 커짐)
    if (hot) {
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, '255,255,240', x, y, u * (0.6 + hot), 0.9 * hot);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  ctx.globalAlpha = 1;

  // ── 불꽃 ──
  let tot = 0;
  for (const b of live) tot += SPK[b.k];
  const lod = Math.min(1, 480 / Math.max(1, tot));
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  // 여럿이 겹치면 번짐을 줄인다 (하얗게 날아가지 않게)
  const haze = Math.min(1, 2.6 / Math.sqrt(Math.max(1, live.length)));
  // 넓은 빛 번짐은 최근 열둘(과 큰 국화)만 — 나머지는 가는 심만
  for (let i = 0; i < live.length; i++) drawBurst(ctx, live[i], t, w, lod, haze, i >= live.length - 8 || live[i].k === 'mum');
  ctx.globalCompositeOperation = 'lighter';
  // 날아가는 것: 쪼개진 불씨 꼬리 · 물고기 꼬리 불 · 용
  for (const m of s.movers) {
    const tau = t - m.t0, [hx, hy] = mpos(m, tau);
    if (m.k === 'sub') {
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = 'rgb(110,250,200)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let j = 0; j < 5; j++) {
        const [px, py] = mpos(m, tau - j * 1.5);
        if (j) ctx.lineTo(X(px), X(py));
        else ctx.moveTo(X(px), X(py));
      }
      ctx.stroke();
      glow(ctx, '170,255,220', X(hx), X(hy), R(0.03), 1);
    } else if (m.k === 'dive') {
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = 'rgb(255,160,70)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const [px, py] = mpos(m, tau - 6);
      ctx.moveTo(X(px), X(py));
      ctx.lineTo(X(hx), X(hy));
      ctx.stroke();
      glow(ctx, '255,180,90', X(hx), X(hy), R(0.06), 0.8);
    } else glow(ctx, '255,140,90', X(hx), X(hy), R(0.09), 0.7);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  for (const m of s.movers) {
    const tau = t - m.t0, [hx, hy] = mpos(m, tau);
    if (m.k === 'dive') {
      ctx.save();
      ctx.translate(X(hx), X(hy));
      ctx.rotate(Math.PI / 2);
      stamp(ctx, lanSpr('fish', 1, 0, R(KD.fish.r) * K), F_FISH, R(KD.fish.r) * 1.15);
      ctx.restore();
    } else if (m.k === 'drag') {
      drawDragonBody(ctx, hx, hy, m.dir, t, w, 0, 2, m, tau);
      ctx.save();
      ctx.translate(X(hx), X(hy));
      if (m.dir < 0) ctx.scale(-1, 1);
      stamp(ctx, lanSpr('dragon', 1, 0, R(KD.dragon.r) * K), F_HEAD, R(KD.dragon.r) * 1.25);
      ctx.restore();
    }
  }

  // ── 이음 고리: 연쇄가 꺼져 가는 끝 등불 둘레의 줄어드는 빛 고리 (안을 톡 = 이음) ──
  if (s.phase === 'play') {
    for (const c of s.chains) {
      const quiet = !busyChain(s, c), can = s.embers > 0, drawn: [number, number][] = [];
      for (let i = c.ends.length - 1; i >= 0; i--) {
        const [ax, ay, at] = c.ends[i], age = t - at, r = R(ringR(age));
        if (r <= 0) continue;
        // 거의 겹치는 고리는 하나만 그린다 (올림픽 고리처럼 어지럽지 않게)
        if (drawn.some(([qx, qy]) => Math.hypot(qx - ax, qy - ay) < 0.09)) continue;
        drawn.push([ax, ay]);
        // 퍼지는 동안엔 옅게, 잦아들면 굵고 밝게 (이제 이을 때)
        const u = age / JOIN_T, a = (can ? 1 : 0.35) * (quiet ? 1 : 0.22) * Math.min(1, (1 - u) * 4);
        const x = X(ax), y = X(ay), pul = quiet ? 1 + 0.04 * Math.sin(t * 0.5) : 1;
        ctx.globalCompositeOperation = 'lighter';
        if (quiet) glow(ctx, '255,200,110', x, y, r * 1.15, 0.2 * a);
        glow(ctx, '255,150,60', x, y, R(0.035) * (1.2 - u), 0.9 * a);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = a;
        ctx.strokeStyle = u > 0.6 ? '#ff8a5a' : '#ffd45a';
        ctx.lineWidth = quiet ? 5 : 1.5;
        ctx.beginPath();
        ctx.arc(x, y, r * pul, 0, TAU);
        ctx.stroke();
        if (quiet) {
          ctx.strokeStyle = 'rgba(255,240,200,.8)';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 7]);
          ctx.lineDashOffset = -t * 0.8;
          ctx.beginPath();
          ctx.arc(x, y, r * pul + 7, 0, TAU);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
    ctx.globalAlpha = 1;
  }
  // 이음 줄: 꺼져 가던 끝에서 톡 자리까지 금빛
  vm.links = vm.links.filter((q) => t - q[4] < 26);
  for (const [x0, y0, x1, y1, lt] of vm.links) {
    const u = (t - lt) / 26;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1 - u;
    ctx.strokeStyle = '#ffcf5a';
    ctx.lineWidth = 9 * (1 - u) + 2;
    ctx.beginPath();
    ctx.moveTo(X(x0), X(y0));
    ctx.lineTo(X(x1), X(y1));
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#fff6d0';
    ctx.lineWidth = 2.5 * (1 - u) + 1;
    ctx.stroke();
    for (let k = 1; k < 4; k++) glow(ctx, '255,220,140', X(x0 + (x1 - x0) * ((k / 4 + u) % 1)), X(y0 + (y1 - y0) * ((k / 4 + u) % 1)), R(0.02), 1 - u);
  }
  ctx.globalAlpha = 1;

  // ── 구경꾼 (환호는 연쇄만큼) ──
  const ex = s.cheer;
  for (const [i, [k, fxp, fyp]] of FANS.entries()) {
    const pose = ex > 0.55 ? 2 : ex > 0.18 ? 1 : 0;
    const hop = pose === 2 ? Math.abs(Math.sin(t * 0.22 + i * 1.3)) * R(0.018) : pose === 1 ? Math.abs(Math.sin(t * 0.16 + i)) * R(0.005) : 0;
    const u = R(k === 2 || k === 4 ? 0.05 : 0.066);
    ctx.save();
    ctx.translate(X(fxp), X(fyp) - hop);
    if (i % 2) ctx.scale(-1, 1);
    stamp(ctx, spr(`fan${k}${pose}`, F_FAN, R(0.066) * K, (g) => paintFan(g, k, pose)), F_FAN, u);
    ctx.restore();
  }

  // ── 호수: 하늘을 거꾸로 비춘다 ──
  reflect(ctx, s, w, t, live);
  ctx.drawImage(lakeLayer(ww, hh, K), 0, hz, w, h - hz);
  // 반짝이는 물결 몇 줄
  ctx.fillStyle = 'rgba(220,230,255,.35)';
  for (let i = 0; i < 7; i++) {
    const y = hz + R(0.02 + hsh(i + 7) * 0.33), x = ((hsh(i + 70) * w + t * (0.2 + hsh(i) * 0.3)) % (w + 40)) - 20, l = 8 + hsh(i + 9) * 18;
    ctx.globalAlpha = 0.25 + 0.25 * Math.sin(t * 0.07 + i);
    ctx.fillRect(x, y, l, 1);
  }
  ctx.globalAlpha = 1;
  // 물보라 고리
  vm.ripples = vm.ripples.filter((r) => t - r[1] < 60);
  for (const [rx, rt, sz] of vm.ripples) {
    const u = (t - rt) / 60;
    ctx.strokeStyle = `rgba(200,235,255,${0.7 * (1 - u)})`;
    ctx.lineWidth = 2;
    for (const k of [1, 0.6]) {
      ell(ctx, X(rx), hz + R(0.02), R(0.04 + u * 0.2 * sz * k), R(0.01 + u * 0.035 * sz * k));
      ctx.stroke();
    }
  }

  // ── 꼬마와 불씨 배 ──
  {
    const bob = Math.sin(t * 0.05) * R(0.006), bx = X(BOAT_X), by = X(BOAT_Y) + bob;
    const tc = topChain(s), pose = s.phase === 'play' && t - s.lastTap < 16 ? 1 : ex > 0.45 || (tc && tc.n >= 10) || s.phase === 'result' ? 2 : s.phase === 'play' && s.embers <= 0 ? 3 : 0;
    // 배 그림자 · 물결
    ctx.fillStyle = 'rgba(5,8,30,.45)';
    ell(ctx, bx, by + R(0.045), R(0.19), R(0.022));
    ctx.fill();
    ctx.save();
    ctx.translate(bx + R(0.01), by - R(0.06) + (pose === 2 ? -Math.abs(Math.sin(t * 0.25)) * R(0.012) : 0));
    stamp(ctx, spr(`kid${pose}`, F_KID, R(0.1) * K, (g) => paintKid(g, pose)), F_KID, R(0.1));
    ctx.restore();
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(Math.sin(t * 0.04) * 0.03);
    stamp(ctx, spr('boat', F_BOAT, R(0.16) * K, paintBoat), F_BOAT, R(0.16));
    ctx.restore();
    // 불씨 (남은 수만큼, 깜빡깜빡) — 연쇄 중엔 "이어 붙여요" 하고 더 밝게
    const ne = s.phase === 'play' ? s.embers : 0, lit = s.chains.length > 0 && ne > 0;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < Math.min(6, ne); i++) {
      const ox = X(POT_X) + (i - (Math.min(6, ne) - 1) / 2) * R(0.026), oy = X(POT_Y) + bob - R(0.022) - (i % 2) * R(0.008);
      const f = 0.8 + 0.2 * Math.sin(t * 0.3 + i * 2);
      glow(ctx, lit ? '255,220,120' : '255,150,70', ox, oy, R(lit ? 0.05 : 0.036) * f, 0.9);
      glow(ctx, '255,250,220', ox, oy, R(0.013), 1);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    if (ne > 6) numS(ctx, '+' + (ne - 6), X(POT_X + 0.1), X(POT_Y) - R(0.02), N_POP);
    // 불꽃 막대 반짝
    if (pose === 0 || pose === 3) {
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, '255,230,150', bx - R(0.045), by - R(0.165), R(0.022) * (0.8 + 0.3 * Math.sin(t * 0.7)), pose === 3 ? 0.4 : 0.9);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
  }
  // ── 톡: 배에서 솟는 불씨 줄기 ──
  vm.streaks = vm.streaks.filter((q) => t - q[2] < 12);
  ctx.globalCompositeOperation = 'lighter';
  for (const [sx, sy, st] of vm.streaks) {
    const u = (t - st) / 12, x0 = X(POT_X), y0 = X(POT_Y) - R(0.02), x1 = X(sx), y1 = X(sy);
    ctx.globalAlpha = 1 - u;
    ctx.strokeStyle = lin(ctx, x0, y0, x1, y1, [0, 'rgba(255,200,120,0)'], [1, 'rgba(255,240,190,1)']);
    ctx.lineWidth = 3 * (1 - u) + 1;
    ctx.beginPath();
    ctx.moveTo(x0 + (x1 - x0) * u * 0.7, y0 + (y1 - y0) * u * 0.7);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  // 별사탕 불씨가 배로 날아감
  vm.flies = vm.flies.filter((q) => t - q[2] < 26);
  for (const [fx0, fy0, ft] of vm.flies) {
    const u = easeOut3((t - ft) / 26), x = X(fx0 + (POT_X - fx0) * u), y = X(fy0 + (POT_Y - fy0) * u) - Math.sin(u * Math.PI) * R(0.12);
    glow(ctx, '255,160,220', x, y, R(0.045), 1);
    glow(ctx, '255,255,255', x, y, R(0.014), 1);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  // ── 떠오르는 숫자 (연쇄 번호) ──
  vm.pops = vm.pops.filter((p) => t - p.t0 < p.life);
  for (const p of vm.pops) {
    const u = (t - p.t0) / p.life, sc = u < 0.12 ? 1.35 - u * 3 : 1;
    ctx.globalAlpha = u > 0.65 ? (1 - u) / 0.35 : 1;
    const px = clamp(p.x, 60, w - 60);
    ctx.save();
    ctx.translate(px, p.y - u * 22);
    ctx.scale(sc, sc);
    txt(ctx, p.str, 0, 0, 24, 900, '#ffe27a', '#3a1420', 5);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // 연쇄 끝 큰 숫자 (하늘 가득이면 금빛 테)
  if (t - vm.bigT < 70 && vm.bigN !== 0 && s.phase !== 'result') {
    const u = (t - vm.bigT) / 70, sc = u < 0.15 ? 0.6 + u * 3.2 : u > 0.8 ? 1 - (u - 0.8) * 2 : 1.08;
    ctx.globalAlpha = u > 0.8 ? (1 - u) * 5 : 1;
    if (vm.bigN < 0) txt(ctx, '하늘 가득!', w / 2, X(0.5), 34 * sc, 900, '#fff0a0', '#5a2a10', 6);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  drawHud(ctx, s, w, vm, K);
}

/** 등불 하나가 터지면 닿을 범위 (점선) */
function drawZones(ctx: C2, L: Lan, w: number, hot: number) {
  const X = (x: number) => x * w, zs = zonesOf(L);
  ctx.save();
  ctx.globalAlpha = 0.25 + 0.45 * hot;
  ctx.strokeStyle = `rgb(${LGLOW[L.k]})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  if (L.k === 'dragon') {
    zs.forEach((z, i) => (i ? ctx.lineTo(X(z[1]), X(z[2])) : ctx.moveTo(X(z[1]), X(z[2]))));
    ctx.stroke();
  } else
    for (const z of zs) {
      if (z[0] === 0) (ctx.moveTo(X(z[1] + z[3]), X(z[2])), ctx.arc(X(z[1]), X(z[2]), X(z[3]), 0, TAU));
      else if (z[0] === 1) ctx.roundRect(X(z[1] - z[3]), X(z[2] - z[4]), X(z[3] * 2), X(z[4] * 2), X(z[4]));
      else if (z[0] === 2) (ctx.moveTo(X(z[1] + z[3]), X(z[2])), ctx.arc(X(z[1]), X(z[2]), X(z[3]), 0, Math.PI, true));
      else ctx.rect(X(z[1] - z[3]), X(z[2]), X(z[3] * 2), X(z[4] - z[2]));
    }
  ctx.stroke();
  ctx.restore();
}
/** 용 몸통: 머리 뒤로 지나온 길을 따라 마디가 이어진다 */
function drawDragonBody(ctx: C2, hx: number, hy: number, dir: number, t: number, w: number, ph: number, mode: number, m?: Mover, tau = 0) {
  const segs = 9, X = (x: number) => x * w;
  for (let j = segs; j >= 1; j--) {
    let x: number, y: number;
    if (mode === 2 && m) [x, y] = mpos(m, tau - j * 3.2);
    else (x = hx - dir * j * 0.034), (y = hy + Math.sin(t * 0.09 - j * 0.7 + ph) * 0.018);
    const r = X(0.03) * (1 - j * 0.06);
    if (mode === 2) {
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, j % 2 ? '255,120,80' : '255,220,100', X(x), X(y), r * 2.6, 0.7);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    ell(ctx, X(x), X(y), r, r * 0.9);
    ctx.fillStyle = j % 2 ? '#ff4a3a' : '#ffcf3a';
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    if (j === segs) {
      // 꼬리 리본
      ctx.strokeStyle = '#4ad08a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(X(x), X(y));
      ctx.quadraticCurveTo(X(x - dir * 0.04), X(y + 0.03), X(x - dir * 0.07), X(y + 0.01 + Math.sin(t * 0.1) * 0.01));
      ctx.stroke();
    }
  }
}

/** 호수에 비친 빛: 등불·불꽃·달을 수면 아래로 길게 일렁이는 빛기둥으로 (픽셀 복사 없이 — 느린 폰) */
const mirror = (y: number) => HZ + (HZ - y) * 0.36;
function reflect(ctx: C2, s: FwState, w: number, t: number, live: Burst[]) {
  const X = (x: number) => x * w;
  ctx.globalCompositeOperation = 'lighter';
  // 달빛 길
  for (let i = 0; i < 6; i++) {
    const y = X(HZ + 0.03 + i * 0.05), x = X(0.84) + Math.sin(t * 0.06 + i * 1.7) * 4;
    glowV(ctx, '255,240,200', x, y, X(0.05 - i * 0.004), X(0.02), 0.25 - i * 0.03);
  }
  for (const L of s.lans) {
    if (t - L.born < L.rel || L.st === 3) continue;
    const u = X(KD[L.k].r) * L.sz, hot = L.st === 1 ? 1.6 : 1, x = X(L.x) + Math.sin(t * 0.07 + L.ph * 3) * 2.5, y = X(mirror(L.y));
    glowV(ctx, LGLOW[L.k], x, y, u * 1.3 * hot, u * 3.2, 0.42);
  }
  let k = 0;
  for (let i = live.length - 1; i >= 0 && k < 14; i--) {
    const b = live[i], tau = t - b.t0;
    if (tau > 60) continue;
    k++;
    const col = burstRgb(b);
    const f = 1 - tau / 60, r = X(b.R) * (b.k === 'mum' ? 1.4 : 1);
    glowV(ctx, col, X(b.x) + Math.sin(t * 0.08 + i) * 3, X(mirror(b.y)), r * 1.1, r * 0.9, 0.5 * f);
    if (tau < 10) glowV(ctx, '255,250,230', X(b.x), X(mirror(b.y)), r * 0.5, r * 0.6, 0.6 * (1 - tau / 10));
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}
/** 세로로 늘인 빛 (물에 비친 불빛) */
function glowV(ctx: C2, rgb: string, x: number, y: number, rx: number, ry: number, a: number) {
  if (a <= 0.01 || rx < 1) return;
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(glowSpr(rgb), x - rx, y - ry, rx * 2, ry * 2);
}

// ── 위 띠 · 안내 · 결과 ──
function drawHud(ctx: C2, s: FwState, w: number, vm: VM, K: number) {
  const X = (x: number) => x * w, R = (r: number) => r * w, t = s.t;
  ctx.fillStyle = lin(ctx, 0, 0, 0, X(0.11), [0, 'rgba(6,8,34,.78)'], [1, 'rgba(6,8,34,0)']);
  ctx.fillRect(0, 0, w, X(0.11));
  // 밤 번호 + 일곱 밤 등불 점
  txt(ctx, `밤 ${s.stage + 1}`, X(0.035), X(0.04), 14, 800, '#fff3d6', '#120a30', 3, 'left');
  for (let i = 0; i < NIGHTS; i++) {
    const x = X(0.04 + i * 0.03), y = X(0.077), done = i < s.stage || (i === s.stage && s.phase === 'result');
    ctx.globalCompositeOperation = 'lighter';
    if (done || i === s.stage) glow(ctx, '255,190,90', x, y, R(0.02) * (i === s.stage ? 1 + 0.2 * Math.sin(t * 0.15) : 1), done ? 0.8 : 0.5);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ell(ctx, x, y, R(0.008), R(0.008));
    ctx.fillStyle = done ? '#ffcf4a' : i === s.stage ? '#ff9a5a' : 'rgba(170,170,230,.35)';
    ctx.fill();
  }
  // 점수 (시원하게 올라감)
  vm.shown += (s.pts - vm.shown) * 0.18;
  if (Math.abs(s.pts - vm.shown) < 1) vm.shown = s.pts;
  const pulse = t - vm.nPulse < 8 ? 1 + (8 - (t - vm.nPulse)) * 0.012 : 1;
  numS(ctx, fmt(vm.shown), w / 2, X(0.052), N_HUD, pulse);
  // 이 밤의 별 셋
  for (let i = 0; i < 3; i++) {
    const on = s.phase === 'result' ? s.stars[i] : i === 1 ? s.lit * 2 >= s.released && s.released > 0 : i === 2 ? s.bestChain >= STAR3[s.stage] : false;
    ctx.save();
    ctx.translate(X(0.8 + i * 0.065), X(0.05));
    stamp(ctx, spr('star' + (on ? 1 : 0), F_STAR, R(0.026) * K, (g) => paintStar(g, on)), F_STAR, R(0.026));
    ctx.restore();
  }
  // 셋째 별의 목표 (한 번에 몇 개)
  if (s.phase === 'play') txt(ctx, String(STAR3[s.stage]), X(0.93), X(0.092), 12, 800, s.bestChain >= STAR3[s.stage] ? '#ffe27a' : '#b8b0e8', '#120a30', 3);
  // 연쇄 배지: 숫자 하나 + 이음 곱 + 이어 붙일 수 있는 시간 고리
  const tc = topChain(s);
  if (tc && tc.n >= 2 && s.phase === 'play') {
    const c = tc, quiet = clamp((t - c.last) / JOIN_T, 0, 1), cx = w / 2, cy = X(0.185), r = R(0.05) + Math.min(6, c.n * 0.15);
    const pu = t - vm.nPulse < 6 ? 1.12 : 1;
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, '255,190,80', cx, cy, r * 2, 0.45);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ell(ctx, cx, cy, r * pu, r * pu);
    ctx.fillStyle = radg(ctx, cx - r * 0.3, cy - r * 0.3, 0, r * 1.2, [0, 'rgba(90,40,120,.9)'], [1, 'rgba(30,14,60,.9)']);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,120,.35)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = quiet > 0.6 ? '#ff7a5a' : '#ffd45a';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r * pu, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - quiet));
    ctx.stroke();
    numS(ctx, String(c.n), cx, cy + 1, N_BADGE, pu * (1 + Math.min(0.15, c.n / 200)));
    if (c.mult > 1) {
      const mb = t - vm.multT < 10 ? 1.35 - (t - vm.multT) * 0.035 : 1;
      ctx.save();
      ctx.translate(cx + r + R(0.045), cy - r * 0.45);
      ctx.scale(mb, mb);
      rr(ctx, -R(0.045), -12, R(0.09), 24, 12);
      ctx.fillStyle = '#ff5a4a';
      ctx.fill();
      ctx.strokeStyle = '#ffe27a';
      ctx.lineWidth = 2;
      ctx.stroke();
      txt(ctx, `×${c.mult}`, 0, 0, 16, 900, '#ffffff');
      ctx.restore();
    }
  }
  // ── 손가락 안내 (첫 톡 전 · 오래 안 누르면) ──
  const hl = s.hint >= 0 ? s.lans.find((L) => L.id === s.hint && L.st === 0) : undefined;
  let hint: [number, number] | null = hl ? [hl.x, hl.y] : null;
  // 밤 1 둘째 하늘부터 처음 한 번: 연쇄가 잦아들면 손가락이 꺼져 가는 고리 안을 가리킨다
  const teachJoin = s.phase === 'play' && s.stage === 0 && s.vol >= 1 && s.joins === 0 && s.embers > 0 && s.chains.some((c) => !busyChain(s, c) && c.ends.length > 0);
  if (teachJoin) {
    if (!vm.hint || t - vm.hint.t > 20) {
      const p = plan(s, true);
      vm.hint = p ? { t, x: p.x, y: p.y } : null;
    }
    if (vm.hint) hint = [vm.hint.x, vm.hint.y];
  } else if (!hint && s.phase === 'play' && s.embers > 0 && !s.chains.length && s.vt > 90 && t - Math.max(s.lastTap, t - s.vt) > 300) {
    if (!vm.hint || t - vm.hint.t > 40) {
      const p = plan(s);
      vm.hint = p ? { t, x: p.x, y: p.y } : null;
    }
    if (vm.hint) hint = [vm.hint.x, vm.hint.y];
  }
  if (hint && s.phase === 'play') {
    const [hx, hy] = hint, b = Math.sin(t * 0.12);
    ctx.strokeStyle = `rgba(255,240,180,${0.5 + 0.4 * b})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(X(hx), X(hy), R(0.05) + b * R(0.012), 0, TAU);
    ctx.stroke();
    ctx.save();
    ctx.translate(X(hx) + R(0.035), X(hy) + R(0.075) + b * R(0.012));
    stamp(ctx, spr('hand', F_HAND, R(0.06) * K, paintHand), F_HAND, R(0.06));
    ctx.restore();
  }
  // 한 줄 안내
  const line = s.phase === 'play' && s.stage === 0 && s.taps === 0 ? '밤하늘을 톡! 등불이 줄줄이 펑' : teachJoin && hint ? '꺼지기 전에 빛 고리 안을 톡 → 이음!' : '';
  if (line) {
    const y = X(0.125) + (s.taps ? X(0.86) : 0);
    rr(ctx, w / 2 - X(0.36), y - 13, X(0.72), 26, 13);
    ctx.fillStyle = 'rgba(20,12,50,.72)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,140,.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    txt(ctx, line, w / 2, y, 14, 800, '#fff3d6');
  }
  // ── 새 등불 소개 (밤 시작 4초) ──
  if (s.phase === 'play' && s.vol === 0 && s.vt < 270 && s.stage > 0) {
    const L = s.lans.find((q) => q.id === s.spot && q.st !== 2);
    if (L && t - L.born >= L.rel) {
      const x = X(L.x), y = X(L.y), a = Math.min(1, s.vt / 20) * (s.vt > 240 ? (270 - s.vt) / 30 : 1);
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#ffe27a';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(x, y, R(0.065) + Math.sin(t * 0.15) * 3, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      const ly = y - R(0.1);
      rr(ctx, clamp(x, X(0.2), X(0.8)) - X(0.17), ly - 12, X(0.34), 24, 12);
      ctx.fillStyle = 'rgba(255,90,70,.92)';
      ctx.fill();
      txt(ctx, 'NEW ' + KD[L.k].name, clamp(x, X(0.2), X(0.8)), ly, 13, 900, '#ffffff');
      ctx.globalAlpha = 1;
    }
  }
  if (s.phase === 'result' || s.phase === 'end') drawResult(ctx, s, w, vm, K);
}

function drawResult(ctx: C2, s: FwState, w: number, vm: VM, K: number) {
  const X = (x: number) => x * w, R = (r: number) => r * w, t = s.t, pt = s.pt;
  const a = Math.min(1, pt / 10), sc = 0.92 + 0.08 * easeOut3(pt / 12);
  const last = s.stage + 1 >= NIGHTS;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(w / 2, X(0.62));
  ctx.scale(sc, sc);
  ctx.translate(-w / 2, -X(0.62));
  const x0 = X(0.08), y0 = X(0.2), pw = X(0.84), ph = X(s.newKind ? 0.86 : 0.66);
  rr(ctx, x0, y0, pw, ph, 18);
  ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + ph, [0, 'rgba(40,22,86,.94)'], [1, 'rgba(18,10,48,.94)']);
  ctx.fill();
  ctx.strokeStyle = '#ffcf4a';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  txt(ctx, last ? '축제 끝!' : `밤 ${s.stage + 1} 끝!`, w / 2, y0 + X(0.06), 18, 900, '#fff3d6');
  // 점수 올라감
  vm.resShown = Math.min(s.nightPts, vm.resShown + Math.max(1, s.nightPts / 40));
  numS(ctx, fmt(vm.resShown), w / 2, y0 + X(0.16), N_RES);
  if (s.newBest && pt > 40) {
    const b = 1 + 0.06 * Math.sin(t * 0.2);
    rr(ctx, w / 2 - X(0.16), y0 + X(0.225) - 12, X(0.32), 24, 12);
    ctx.fillStyle = '#ff5a6a';
    ctx.fill();
    txt(ctx, `최고 기록! ${fmt(s.bestNight)}`, w / 2, y0 + X(0.225), 13 * b, 900, '#fff');
  } else if (s.stage > 0) txt(ctx, `최고 기록 ${fmt(s.bestNight)}`, w / 2, y0 + X(0.225), 13, 700, '#b8b0e8');
  // 별 셋 (차례로 쿵)
  const labels = ['밤 마침', '등불 절반', `한 번에 ${STAR3[s.stage]}개`];
  for (let i = 0; i < 3; i++) {
    const at = 18 + i * 12, on = s.stars[i] && pt >= at, sx = X(0.27 + i * 0.23), sy = y0 + X(0.33);
    if (s.stars[i] && pt >= at && vm.star <= i) (vm.star = i + 1), juice(s).sound('ding', 1 + i * 0.12, 0.8), juice(s).kick(3);
    const bump = on && pt - at < 8 ? 1.3 - (pt - at) * 0.035 : 1;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(bump, bump);
    stamp(ctx, spr('star' + (on ? 1 : 0), F_STAR, R(0.05) * K, (g) => paintStar(g, on)), F_STAR, R(0.05));
    ctx.restore();
    txt(ctx, labels[i], sx, sy + X(0.075), 12, 700, on ? '#ffe9a8' : '#8a86c0');
  }
  // 새 등불 풀림
  if (s.newKind) {
    const k = s.newKind, ny = y0 + X(0.6), bob = Math.sin(t * 0.08) * 3;
    txt(ctx, '새 등불', w / 2, y0 + X(0.47), 13, 800, '#ffb0a0');
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, LGLOW[k], X(0.3), ny + bob, R(0.1), 0.8);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = a;
    ctx.save();
    ctx.translate(X(0.3), ny + bob);
    if (k === 'dragon') drawDragonBody(ctx, 0.3, (ny + bob) / w, 1, t, w, 0, 1);
    stamp(ctx, lanSpr(k, 0, 0, R(KD[k].r) * 1.9 * K), frameOf(k), R(KD[k].r) * 1.9);
    ctx.restore();
    txt(ctx, KD[k].name, X(0.42), ny - 10, 20, 900, '#ffe27a', '', 0, 'left');
    txt(ctx, NEWS[k], X(0.42), ny + 14, 13, 700, '#d8d0ff', '', 0, 'left');
  }
  if (pt > RES_MIN) {
    ctx.globalAlpha = a * (0.6 + 0.4 * Math.sin(t * 0.12));
    txt(ctx, last ? '톡 → 점수 보기' : '톡 → 다음 밤', w / 2, y0 + ph - X(0.045), 13, 800, '#fff3d6');
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
