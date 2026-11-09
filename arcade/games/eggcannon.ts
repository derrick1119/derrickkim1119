/**
 * 꼬꼬 알 대포 농장 (20라운드 새 아이디어) — 포격전 × 꾹 눌렀다 떼기 × 농사·수확.
 * 기준 9(손이 하는 일은 하나): 꾹 누르면 용수철 위 암탉이 꼬꼬댁 부풀어 오르고(누른 만큼 멀리), 떼는 순간 꽁지로 알을 '퐁!' 쏜다.
 *   암탉은 용수철 위에서 까딱까딱 앞뒤로 기운다 → 떼는 순간의 기울기가 포물선 높이(높이 넘길지·낮게 쏠지)를 정한다.
 *   누르는 동안 점선 안내가 보인다(앞부분만 · 바람은 안 보임). 너무 오래 누르면 꼬꼬댁! 저절로 발사(기준 8).
 * 와우: 알이 포물선을 그리며 둥지에 쏙 — 톡톡 금이 가더니 병아리가 '삐약!' 튀어나온다.
 *   빗나간 알은 '퍽!' 깨지고 껍데기 모자를 쓴 병아리가 '삐약?' 하고 혼자 헤맨다(실패도 웃음).
 * 고민: 가까운 둥지(×1)냐 먼 금테 둥지(×2)냐 · 울타리를 넘길 높은 포물선 · 소 등에 튕겨 ×2 · 움직이는 트랙터 수레·풍차 바구니는 갈 곳을 미리
 *   · 여우가 오면 둥지 대신 여우를 맞혀 쫓기 · 황금알은 무거워 덜 날지만 ×2 → 어느 둥지에 아낄지.
 * 판 = 하루. 알을 다 쏘면 해가 지고, 병아리 목표를 채우면 별 1~3개, 못 채우면 하트 -1 그날 다시. 8일째까지.
 * 펼쳐짐: 둥지·쌍둥이(1일) → 울타리(2일) → 소 튕기기(3일) → 트랙터 수레(4일) → 바람(5일) → 풍차 바구니(6일) → 여우(7일) → 황금알·보름달(8일)
 *        · 키운 병아리는 밤새 어미닭이 되어 다음 날 알을 보탠다 · 농장이 자란다(닭장 2층 → 헛간 → 사일로·양 → 연못).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.15, TAU = Math.PI * 2, LZ = 0.5;
/** 중력 · 황금알 무게 · 알이 나오는 곳(암탉 꽁지, 칸 단위) */
const G = 0.0062, GOLDG = 1.3, HX = 0.95, HY = 2.0;
/** 누른 시간 → 세기(날아가는 거리가 누른 시간에 거의 비례하도록 제곱근). FULL틱이면 가득, OVER틱이면 꼬꼬댁! 저절로 발사 */
const VMIN = 0.07, VMAX = 0.26, FULL = 110, OVER = 165, MINH = 6, COOLT = 12;
/** 용수철 위에서 까딱까딱: ROCK틱에 한 번, 28°~64° */
const ROCK = 200, ANG0 = (46 * Math.PI) / 180, ANGA = (18 * Math.PI) / 180;
const DAY = 60 * 45, NIGHT = 150, DAYS = 8, HATCH = 30, GUIDE = 50;
const XMIN = -1.8, XMAX = 14.6, XL = -1.2, XR = 13.2;
/** 소(타원 몸통, 튕김) · 트랙터 수레 · 풍차 · 여우 */
const CRX = 0.85, CRY = 0.42, CY = 0.98, REST = 0.82;
const CARTD = 1.35, CARTY = 0.85, CARTW = 0.56, TRV = 0.016;
const MILLW = TAU / 480, MR = 2.0;
const FOXV = 0.017, FOXY = 0.42, FOXR = 0.55, LURK = 12.2;

interface Fence { x: number; h: number; hay: boolean }
interface DayCfg {
  name: string; eggs: number; nests: [number, number][]; r: number; fences: Fence[];
  cow: [number, number] | null; tractor: [number, number] | null; wind: number; mill: [number, number] | null;
  fox: boolean; gold: boolean; night: boolean; goal: [number, number, number]; news: string[];
}
const day = (c: Partial<DayCfg> & Pick<DayCfg, 'name' | 'eggs' | 'nests' | 'goal'>): DayCfg => ({ r: 0.5, fences: [], cow: null, tractor: null, wind: 0, mill: null, fox: false, gold: false, night: false, news: [], ...c });
/** 날마다 둥지(x, 몇 쌍둥이)·장애물·목표(병아리 ★·★★·★★★) */
const DAYC: DayCfg[] = [
  day({ name: '앞마당', eggs: 5, nests: [[3.4, 1], [5.8, 1], [8.4, 2], [11.2, 1]], r: 0.6, goal: [2, 3, 5] }),
  day({ name: '울타리 밭', eggs: 5, nests: [[3.3, 1], [7.5, 1], [9.3, 2], [11.7, 1]], fences: [{ x: 6.2, h: 2.4, hay: false }], goal: [2, 3, 5], news: ['fence'] }),
  day({ name: '소 목장', eggs: 6, nests: [[3.4, 1], [6.4, 1], [8.8, 1], [11.9, 2]], fences: [{ x: 10.4, h: 2.9, hay: true }], cow: [4.6, 8.0], goal: [3, 5, 7], news: ['cow'] }),
  day({ name: '트랙터 길', eggs: 6, nests: [[3.0, 1], [4.2, 1], [12.7, 2]], tractor: [6.6, 10.4], goal: [3, 5, 8], news: ['tractor'] }),
  day({ name: '바람 언덕', eggs: 6, nests: [[3.6, 1], [6.8, 1], [9.2, 2], [11.8, 2]], fences: [{ x: 5.3, h: 1.8, hay: false }], wind: 0.0011, goal: [3, 4, 6], news: ['wind'] }),
  day({ name: '풍차 마을', eggs: 6, nests: [[3.2, 1], [5.2, 1], [12.4, 1]], mill: [8.6, 4.6], goal: [3, 5, 8], news: ['mill'] }),
  day({ name: '여우 숲가', eggs: 7, nests: [[3.4, 1], [6.0, 1], [8.6, 2], [11.0, 1], [12.6, 2]], cow: [4.6, 7.4], fox: true, goal: [3, 5, 7], news: ['fox'] }),
  day({ name: '보름달 밤', eggs: 7, nests: [[3.2, 1], [7.4, 2], [9.8, 1], [12.4, 2]], fences: [{ x: 5.6, h: 2.0, hay: false }], cow: [8.2, 11.2], wind: 0.0006, fox: true, gold: true, night: true, goal: [4, 7, 10], news: ['gold', 'moon'] }),
];
const SEE: Record<string, string> = {
  hatch: '🐣 둥지에 쏙 — 병아리가 태어나요!',
  twin: '✨ 금테 둥지는 쌍둥이 ×2',
  lost: '🥚 빗나간 알은 깨져서 병아리가 삐약? 헤매요',
  full: '🪺 병아리가 있는 둥지에 또 쏘면 와장창',
  over: '😵 너무 오래 누르면 꼬꼬댁! 저절로 발사',
  far: '💨 너무 세면 저 멀리~ 날아가요',
  fence: '🪵 울타리 — 꼬꼬가 고개 숙일 때 쏘면 높이 넘어가요',
  cow: '🐄 소 등에 맞으면 통! 튀어서 둥지에 쏙 = ×2',
  bounce: '🐄 통-쏙! 소 점프 보너스 ×2',
  tractor: '🚜 트랙터 수레 둥지 ×3 — 갈 곳을 미리 노려요',
  wind: '🍃 바람 — 깃발 쪽으로 알이 밀려요 (안내선엔 안 보여요)',
  mill: '🌬️ 풍차 바구니 ×2 — 돌아오는 때를 노려요',
  fox: '🦊 여우가 둥지 병아리를 노려요 — 알로 맞혀 쫓아요!',
  foxhit: '🦊 깨갱! 여우는 알이 무서워요',
  gold: '🌟 황금알 — 무거워서 덜 날지만 병아리 ×2',
  moon: '🌕 보름달 밤 — 등불 아래 둥지를 노려요',
  hens: '🐔 병아리가 자라 어미닭 — 알을 보태요',
  coop2: '🏠 닭장이 2층이 됐어요',
  barn: '🌾 빨간 헛간이 생겼어요',
  silo: '🐑 사일로와 양 떼가 왔어요',
  pond: '🦆 연못에 오리 가족이 왔어요',
};
const KIDS = ['', '삐약!', '쌍둥이! 삐약삐약', '세쌍둥이!!', '네쌍둥이!!', '', '여섯쌍둥이!!!'];

export interface Nest { kind: 0 | 1 | 2; x: number; r: number; mult: number; cap: number; k: number; vals: number[]; at: number[] }
export interface Egg { x: number; y: number; vx: number; vy: number; w: number; gold: boolean; bounce: number; spin: number; trail: number[] }
interface Lost { x: number; t: number; d: number }
interface Fox { x: number; mode: number; t: number; tgt: number }
interface Ev { t: number; kind: string; x: number; y: number; text?: string; n?: number }
interface Note { t: number; text: string; color: string }
export interface EggState {
  rng: Rng; t: number; day: number; dayT: number; key: number; phase: 'day' | 'night'; pause: number; retry: boolean; won: boolean; dead: boolean;
  cfg: DayCfg; nests: Nest[]; eggs: Egg[]; left: number; total0: number; shot: number; charge: number; pressT: number; cool: number; lock: boolean;
  wind: number; ph: number; cph: number; fox: Fox; endAt: number; perfect: boolean;
  dayChicks: number; chicks: number; hens: number; yardNew: number; bonus: number; stars: number; dayStars: number; cleared: number; hearts: number;
  lost: Lost[]; trail: number[]; lastFire: number; lastPow: number; lastGood: number; lastBad: number; cowHit: number;
  seen: Set<string>; events: Ev[]; notes: Note[];
}

const hsh = (k: number) => ((Math.imul(k + 1, 2654435761) >>> 0) % 10007) / 10007;
const ev = (s: EggState, kind: string, x: number, y: number, text?: string, n?: number) => s.events.push({ t: s.t, kind, x, y, text, n });
const note = (s: EggState, text: string, color = '#ffffff') => s.notes.push({ t: s.t, text, color });
function see(s: EggState, key: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  note(s, SEE[key], '#ffe08a');
}

/** 떼는 순간의 기울기 (용수철 위 까딱까딱) — 봇도 같은 함수로 앞을 내다본다 */
export const angleAt = (s: EggState, T: number) => ANG0 + ANGA * Math.sin((TAU * T) / ROCK + s.ph);
const powP = (p: number) => Math.sqrt(VMIN * VMIN + (VMAX * VMAX - VMIN * VMIN) * Math.max(0, Math.min(1, p)));
/** 누른 시간 → 알의 처음 빠르기 */
export const powerOf = (H: number) => powP(H / FULL);
export function cowX(s: EggState, T: number) {
  const c = s.cfg.cow!;
  return (c[0] + c[1]) / 2 + ((c[1] - c[0]) / 2) * Math.sin(T / 260 + s.cph);
}
const cowDir = (s: EggState, T: number) => (Math.cos(T / 260 + s.cph) >= 0 ? 1 : -1);
const trPhase = (s: EggState, T: number) => (T * TRV + s.cph * 3) % (2 * (s.cfg.tractor![1] - s.cfg.tractor![0]));
export function tractorX(s: EggState, T: number) {
  const [a, b] = s.cfg.tractor!, L = b - a, p = trPhase(s, T);
  return a + (p < L ? p : 2 * L - p);
}
const tractorDir = (s: EggState, T: number) => (trPhase(s, T) < s.cfg.tractor![1] - s.cfg.tractor![0] ? 1 : -1);
const millA = (s: EggState, T: number) => s.cph + T * MILLW;
let NX = 0, NY = 0;
/** 둥지 테두리 가운데 (땅 둥지 · 트랙터 수레 · 풍차 바구니) */
function nestPos(s: EggState, n: Nest, T: number) {
  if (n.kind === 0) (NX = n.x), (NY = 0.3);
  else if (n.kind === 1) (NX = tractorX(s, T) - tractorDir(s, T) * CARTD), (NY = CARTY);
  else {
    const m = s.cfg.mill!, a = millA(s, T) + (n.k * TAU) / 3;
    NX = m[0] + MR * Math.cos(a);
    NY = m[1] + MR * Math.sin(a) - 0.45;
  }
}

// ───────────────────────────── 알 한 틱 (게임·봇·안내선이 같은 함수) ─────────────────────────────
const FLY = 0, BOUNCE = 1, NEST = 2, FOXH = 3, GROUND = 4, FENCE = 5, TRAC = 6, FULLH = 7, OUT = 8;
let hitI = -1, hitX = 0, hitY = 0;
function tick(s: EggState, e: Egg, T: number, foxX: number, full: Uint8Array | null): number {
  const c = s.cfg;
  e.vx += e.w;
  e.vy -= e.gold ? G * GOLDG : G;
  const px = e.x, py = e.y;
  e.x += e.vx;
  e.y += e.vy;
  hitX = e.x;
  hitY = e.y;
  if (e.x > XMAX || e.x < XMIN) return OUT;
  for (let i = 0; i < c.fences.length; i++) {
    const f = c.fences[i];
    if ((px - f.x) * (e.x - f.x) <= 0 && px !== e.x) {
      const yy = py + ((e.y - py) * (f.x - px)) / (e.x - px);
      if (yy < f.h) return (hitX = f.x), (hitY = Math.max(0.15, yy)), FENCE;
    }
  }
  let cx = 0;
  if (c.tractor) {
    const tx = tractorX(s, T);
    if (Math.abs(e.x - tx) < 0.62 && e.y < 1.25) return TRAC;
    cx = tx - tractorDir(s, T) * CARTD;
  }
  if (c.cow) {
    const ox = cowX(s, T), dx = (e.x - ox) / CRX, dy = (e.y - CY) / CRY;
    if (dx * dx + dy * dy < 1) {
      let nx = dx / CRX, ny = dy / CRY;
      const l = Math.hypot(nx, ny) || 1;
      nx /= l;
      ny /= l;
      const vn = e.vx * nx + e.vy * ny;
      if (vn < 0) {
        e.vx = (e.vx - 2 * vn * nx) * REST;
        e.vy = Math.max(0.1, (e.vy - 2 * vn * ny) * REST);
        e.x = px;
        e.y = py;
        e.bounce++;
        return BOUNCE;
      }
    }
  }
  const ns = s.nests;
  for (let i = 0; i < ns.length; i++) {
    nestPos(s, ns[i], T);
    if (py >= NY && e.y < NY) {
      const xc = px + ((e.x - px) * (py - NY)) / (py - e.y);
      if (Math.abs(xc - NX) < ns[i].r) {
        hitI = i;
        hitX = NX;
        hitY = NY;
        return (full ? full[i] : ns[i].vals.length) >= ns[i].cap ? FULLH : NEST;
      }
    }
  }
  if (c.tractor && Math.abs(e.x - cx) < CARTW && e.y < CARTY - 0.05) return TRAC;
  if (foxX > -50 && Math.hypot(e.x - foxX, e.y - FOXY) < FOXR) return FOXH;
  if (e.y <= 0) return (hitY = 0), GROUND;
  return FLY;
}

/** 여우가 k틱 뒤에 있을 곳 (봇의 앞날 흉내용, 없으면 -99) */
function foxPred(s: EggState, k: number) {
  const f = s.fox;
  if (!s.cfg.fox) return -99;
  if (f.mode === 1) {
    const goal = f.tgt >= 0 ? s.nests[f.tgt].x + 0.35 : LURK;
    return f.x > goal ? Math.max(goal, f.x - FOXV * k) : Math.min(goal, f.x + FOXV * k);
  }
  if (f.mode === 0 && f.t <= k) return Math.max(LURK, 13.9 - FOXV * (k - f.t));
  return -99;
}

function fire(s: EggState, over: boolean) {
  const H = s.charge, v = powerOf(H), a = angleAt(s, s.dayT), gold = s.cfg.gold && s.shot % 3 === 2;
  s.eggs.push({ x: HX, y: HY, vx: v * Math.cos(a), vy: v * Math.sin(a), w: s.wind, gold, bounce: 0, spin: 0, trail: [HX, HY] });
  s.shot++;
  s.left--;
  s.charge = 0;
  s.cool = COOLT;
  s.lastFire = s.t;
  s.lastPow = Math.min(1, H / FULL);
  if (over) (s.lock = true), ev(s, 'over', HX, HY, '꼬꼬댁!!'), see(s, 'over');
  else ev(s, 'fire', HX, HY, H >= FULL ? '빵야!!' : H > 70 ? '뻥!' : '퐁!');
  if (s.cfg.wind) s.wind = (s.rng() * 2 - 1) * s.cfg.wind;
}

function resolve(s: EggState, e: Egg, r: number) {
  if (r === NEST) {
    const n = s.nests[hitI], val = n.mult * (e.bounce ? 2 : 1) * (e.gold ? 2 : 1);
    n.vals.push(val);
    n.at.push(s.dayT);
    s.dayChicks += val;
    s.chicks += val;
    s.lastGood = s.t;
    ev(s, 'land', hitX, hitY, e.bounce ? '통-쏙!' : '쏙!', val);
    if (e.bounce) see(s, 'bounce');
    return;
  }
  s.lastBad = s.t;
  if (r === FOXH) {
    s.fox.mode = 3;
    ev(s, 'foxhit', hitX, hitY, '깨갱!');
    see(s, 'foxhit');
    return;
  }
  if (r === OUT) {
    ev(s, 'out', Math.min(XR - 0.4, Math.max(XL + 0.4, hitX)), Math.min(7, hitY), '저 멀리~');
    see(s, 'far');
    return;
  }
  ev(s, 'break', hitX, hitY, r === TRAC ? '깡!' : r === FULLH ? '와장창!' : '퍽!');
  if (r === FULLH) see(s, 'full');
  s.lost.push({ x: Math.max(XL + 0.4, Math.min(XR - 0.4, r === FENCE ? hitX - 0.3 : hitX)), t: s.t, d: hsh(s.t) * TAU });
  if (s.lost.length > 10) s.lost.shift();
  see(s, 'lost');
}

function foxStep(s: EggState) {
  const f = s.fox;
  if (f.mode === 0) {
    if (--f.t <= 0 && s.endAt < 0) (f.mode = 1), (f.x = 13.9), ev(s, 'foxin', 12.8, 1.2, '히히…');
    return;
  }
  if (f.mode === 1) {
    let tg = -1, bd = 1e9;
    for (let i = 0; i < s.nests.length; i++) {
      const n = s.nests[i];
      if (n.kind === 0 && n.vals.length && Math.abs(n.x - f.x) < bd) (bd = Math.abs(n.x - f.x)), (tg = i);
    }
    f.tgt = tg;
    const goal = tg >= 0 ? s.nests[tg].x + 0.35 : LURK;
    f.x += Math.max(-FOXV, Math.min(FOXV, goal - f.x));
    if (tg >= 0 && Math.abs(f.x - goal) < 0.01) {
      const n = s.nests[tg], val = n.vals.pop()!;
      n.at.pop();
      s.dayChicks -= val;
      s.chicks -= val;
      f.mode = 2;
      s.lost.push({ x: n.x - 0.4, t: s.t, d: 0 });
      ev(s, 'steal', n.x, 0.6, '삐약!!', val);
    }
    return;
  }
  const away = f.mode === 3;
  f.x += away ? 0.055 : 0.035;
  if (f.x > 14.4) (f.mode = 0), (f.t = away ? 420 : 300), (f.tgt = -1);
}

function startDay(s: EggState) {
  const c = (s.cfg = DAYC[s.day]), again = s.retry;
  s.key++;
  s.retry = false;
  if (s.yardNew) {
    s.hens += s.yardNew;
    s.yardNew = 0;
  }
  const bonus = Math.min(3, Math.floor(s.hens / 6));
  s.total0 = s.left = c.eggs + bonus;
  s.shot = 0;
  s.dayChicks = 0;
  s.eggs = [];
  s.lost = [];
  s.trail = [];
  s.charge = 0;
  s.cool = 0;
  s.endAt = -1;
  s.perfect = false;
  s.dayT = 0;
  s.phase = 'day';
  s.ph = s.day === 0 && !again ? -0.5 : s.rng() * TAU;
  s.cph = s.rng() * 6;
  s.wind = c.wind ? (s.rng() * 2 - 1) * c.wind : 0;
  s.nests = c.nests.map(([x, m]) => ({ kind: 0, x: x + (s.rng() - 0.5) * 0.5, r: c.r, mult: m, cap: 1, k: 0, vals: [], at: [] }) as Nest);
  if (c.tractor) s.nests.push({ kind: 1, x: 0, r: 0.56, mult: 3, cap: 2, k: 0, vals: [], at: [] });
  if (c.mill) for (let k = 0; k < 3; k++) s.nests.push({ kind: 2, x: 0, r: 0.46, mult: 2, cap: 1, k, vals: [], at: [] });
  s.fox = { x: 14.5, mode: 0, t: 200, tgt: -1 };
  note(s, again ? `🔁 ${s.day + 1}일째 다시 — 병아리 ${c.goal[0]}마리` : `☀️ ${s.day + 1}일째 · ${c.name} — 병아리 ${c.goal[0]}마리`, again ? '#ffd0d0' : '#ffffff');
  for (const k of c.news) see(s, k);
  if (bonus) see(s, 'hens');
  const farm = s.hens;
  if (farm >= 8) see(s, 'coop2');
  if (farm >= 16) see(s, 'barn');
  if (farm >= 26) see(s, 'silo');
  if (farm >= 38) see(s, 'pond');
}

function endDay(s: EggState) {
  const g = s.cfg.goal, st = g.filter((x) => s.dayChicks >= x).length;
  s.phase = 'night';
  s.pause = NIGHT;
  s.endAt = -1;
  s.charge = 0;
  s.eggs = [];
  s.yardNew += Math.max(0, s.dayChicks);
  if (st > 0) {
    s.stars += st;
    s.dayStars = st;
    s.cleared++;
    s.retry = false;
    ev(s, 'clear', 6, 4, `${s.day + 1}일째 성공! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, st);
    if (s.day === DAYS - 1) note(s, `🏆 8일 만에 꼬꼬 농장 완성! ★ ${s.stars}`, '#ffe08a');
  } else {
    s.hearts--;
    s.retry = true;
    s.dayStars = 0;
    ev(s, 'fail', 6, 4, `병아리 ${s.dayChicks}/${g[0]} — 모자라요 · ♥ -1`);
    if (s.hearts <= 0) s.dead = true;
  }
}

/** 지금 해가 지면 받을 별 */
export const starsNow = (s: EggState) => s.cfg.goal.filter((x) => s.dayChicks >= x).length;

export const eggcannon: GameDef<EggState> = {
  id: 'eggcannon',
  name: '꼬꼬 알 대포 농장',
  genes: ['hold', 'artillery', 'farm'],
  twist: '꾹 누르면 용수철 위 암탉이 꼬꼬댁 부풀어 오르고, 떼는 순간 까딱이던 기울기대로 꽁지에서 알이 퐁! — 둥지에 쏙 들어가면 병아리가 태어나 농장이 커진다',
  rules: [
    '꾹 누르면 꼬꼬가 부풀어요 — 오래 누를수록 멀리, 떼는 순간 기울기로 알이 퐁!',
    '둥지에 쏙 들어가면 병아리가 태어나요. 빗나간 알은 깨져서 삐약?',
    '알을 다 쏘기 전에 병아리 목표를 채우면 별 — 8일째까지 농장을 키워요.',
  ],
  controls: 'hold',
  hint: '꾹 누르면 꼬꼬가 부풀고, 떼면 알이 퐁! / 스페이스',
  aspect: A,
  art: {
    concept: '봄날 꼬꼬 농장 디오라마',
    mood: '나무 받침대 위에 놓인 두께 있는 풀밭 농장. 빨간 지붕 닭장 옆 짚단 위에서 용수철을 탄 하얀 암탉이 까딱까딱, 금테 둥지들이 밭에 흩어져 있고, 얼룩소가 되새김질하며 어슬렁, 트랙터와 풍차가 돈다. 해가 지면 닭장 창문과 등불이 노랗게 번진다.',
    palette: { bg: '#1f2a1a', ink: '#fffaf0', muted: '#9aa57f', accent: '#ffc93c', hot: '#ff6b5a', soft: '#ffe9b8' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), t: 0, day: 0, dayT: 0, key: 0, phase: 'day', pause: 0, retry: false, won: false, dead: false,
      cfg: DAYC[0], nests: [], eggs: [], left: 0, total0: 0, shot: 0, charge: 0, pressT: 0, cool: 0, lock: false,
      wind: 0, ph: 0, cph: 0, fox: { x: 14.5, mode: 0, t: 0, tgt: -1 }, endAt: -1, perfect: false,
      dayChicks: 0, chicks: 0, hens: 0, yardNew: 0, bonus: 0, stars: 0, dayStars: 0, cleared: 0, hearts: 3,
      lost: [], trail: [], lastFire: -999, lastPow: 0, lastGood: -999, lastBad: -999, cowHit: -999,
      seen: new Set<string>(), events: [], notes: [],
    } as EggState;
    startDay(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    if (s.events.length && s.t - s.events[0].t > 100) s.events = s.events.filter((e) => s.t - e.t <= 100);
    if (s.notes.length && s.t - s.notes[0].t > 220) s.notes = s.notes.filter((e) => s.t - e.t <= 220);
    if (s.dead) return;
    if (s.phase === 'night') {
      if (--s.pause > 0) return;
      if (s.retry) startDay(s);
      else if (s.day + 1 >= DAYS) (s.dead = true), (s.won = true);
      else s.day++, startDay(s);
      return;
    }
    s.dayT++;
    // 날아가는 알
    const foxX = s.fox.mode === 1 ? s.fox.x : -99;
    for (let i = 0; i < s.eggs.length; i++) {
      const e = s.eggs[i], r = tick(s, e, s.dayT, foxX, null);
      e.spin += 0.22;
      if (s.dayT % 2 === 0) e.trail.push(e.x, e.y);
      if (r === FLY) continue;
      if (r === BOUNCE) {
        s.cowHit = s.t;
        ev(s, 'bounce', e.x, e.y, '통!');
        see(s, 'cow');
        continue;
      }
      e.trail.push(hitX, hitY);
      s.trail = e.trail;
      s.eggs.splice(i--, 1);
      resolve(s, e, r);
    }
    // 꾹 눌렀다 떼기
    const down = !!inp.hold;
    if (!down) s.lock = false;
    if (s.cool > 0) s.cool--;
    const can = s.left > 0 && s.cool === 0 && s.endAt < 0 && !s.lock;
    if (down && can) {
      if (s.charge === 0) s.pressT = s.t;
      s.charge++;
      if (s.charge >= OVER) fire(s, true);
    } else if (s.charge > 0) {
      if (s.charge >= MINH) fire(s, false);
      else (s.charge = 0), ev(s, 'tap', HX + 1.2, HY + 1.4, '꾹 눌러요!');
    }
    // 알이 깨어난다
    for (const n of s.nests)
      for (let j = 0; j < n.at.length; j++)
        if (s.dayT - n.at[j] === HATCH) {
          const v = n.vals[j];
          nestPos(s, n, s.dayT);
          ev(s, 'hatch', NX, NY, KIDS[v] || `${v}마리!!`, v);
          see(s, 'hatch');
          if (v >= 2) see(s, 'twin');
        }
    if (s.cfg.fox) foxStep(s);
    // 하루 끝: 알을 다 썼거나 둥지가 다 찼으면 (깨어나는 것까지 보고)
    if (s.endAt < 0 && s.charge === 0 && !s.eggs.length) {
      const hatching = s.nests.some((n) => n.at.some((a) => s.dayT - a < HATCH + 6));
      const allFull = s.nests.every((n) => n.vals.length >= n.cap);
      if (!hatching && (s.left === 0 || allFull)) {
        s.endAt = s.dayT + 45;
        if (allFull && s.left > 0) {
          s.perfect = true;
          s.bonus += s.left * 5;
          ev(s, 'perfect', 6, 4, `둥지 가득! 남은 알 ${s.left}개 +${s.left * 5}`);
        }
      }
    }
    if (s.endAt < 0 && s.dayT >= DAY) s.endAt = s.dayT;
    if (s.endAt >= 0 && s.dayT >= s.endAt) endDay(s);
  },
  over: (s) => s.dead,
  /** 병아리 한 마리 10점 · 별 하나 30점 · 둥지를 다 채우고 남은 알 5점 · 8일을 다 키우면 100점 */
  score: (s) => s.chicks * 10 + s.stars * 30 + s.bonus + (s.won ? 100 : 0),
  draw(ctx, s, w, h, th: Theme) {
    drawFarm(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const rgb = (c: string) => (c[0] === '#' ? [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)] : c.slice(4, -1).split(',').map(Number));
function mix(a: string, b: string, t: number) {
  const p = rgb(a), q = rgb(b), u = Math.max(0, Math.min(1, t));
  return `rgb(${Math.round(p[0] + (q[0] - p[0]) * u)},${Math.round(p[1] + (q[1] - p[1]) * u)},${Math.round(p[2] + (q[2] - p[2]) * u)})`;
}
const EMOJI = 'system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const SKY: [number, string, string][] = [
  [0, '#86c9f0', '#fff0d2'],
  [0.25, '#5fb6ee', '#d6f1ff'],
  [0.62, '#58aeea', '#cdeeff'],
  [0.86, '#8c78c0', '#ffb27a'],
  [1, '#4a3f86', '#ff8f6a'],
];

function drawFarm(ctx: CanvasRenderingContext2D, s: EggState, w: number, h: number, th: Theme) {
  const fx = juice(s), c = s.cfg, R = (q: number) => q * w;
  const topH = R(0.14), botH = R(0.09), D = R(0.36), skew = D * 0.35, S = (w - 12 - skew) / (XR - XL), OX = 6 - XL * S;
  const T = R(0.05), yF = h - botH - T - R(0.025) - 6, yB = yF - D;
  const X = (wx: number, z: number) => OX + wx * S + z * skew;
  const Y = (z: number, hg: number) => yF - z * D - hg * S;
  const LX = (wx: number) => X(wx, LZ), LY = (hg: number) => Y(LZ, hg);
  const poly = (pts: number[][], fill: string | CanvasGradient) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  const ell = (x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, rot = 0) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
    ctx.fill();
  };
  const emo = (e: string, x: number, y: number, size: number) => {
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.font = `${size}px ${EMOJI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(e, x, y);
  };
  const bubble = (x: number, y: number, text: string, size: number, col = '#3a2a1a') => {
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    const tw = ctx.measureText(text).width + size;
    ctx.fillStyle = 'rgba(255,255,255,.93)';
    ctx.beginPath();
    ctx.roundRect(x - tw / 2, y - size * 0.85, tw, size * 1.5, size * 0.6);
    ctx.moveTo(x - 3, y + size * 0.6);
    ctx.lineTo(x, y + size * 1.05);
    ctx.lineTo(x + 4, y + size * 0.6);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y - size * 0.1);
  };
  const T0 = s.dayT;
  const night = s.phase === 'night' ? Math.min(1, (NIGHT - s.pause) / 30, s.pause / 30 + 0.25) : 0;
  const prog = s.phase === 'night' ? 1 : Math.min(1, Math.max(T0 / DAY, (s.shot - s.eggs.length * 0.5) / Math.max(1, s.total0)));
  const sun0 = fx.memo.sun ?? prog;
  const f = (fx.memo.sun = sun0 + (prog - sun0) * 0.05);
  const moon = c.night;
  const dark = moon ? 0.62 : night;
  const dusk = moon ? 0.42 : Math.max(night * 0.42, f > 0.72 ? ((f - 0.72) / 0.28) * 0.26 : 0);
  const dance = s.phase === 'night' && !s.retry, sad = s.phase === 'night' && s.retry;
  const lights: [number, number, number, string][] = [];

  ctx.save();
  fx.begin(ctx);
  // ── 하늘 ──
  let a0 = SKY[0], b0 = SKY[SKY.length - 1];
  for (let i = 0; i < SKY.length - 1; i++) if (f >= SKY[i][0] && f <= SKY[i + 1][0]) (a0 = SKY[i]), (b0 = SKY[i + 1]);
  const u0 = (f - a0[0]) / Math.max(1e-6, b0[0] - a0[0]);
  const sg = ctx.createLinearGradient(0, 0, 0, yB);
  sg.addColorStop(0, mix(mix(a0[1], b0[1], u0), '#121842', dark));
  sg.addColorStop(1, mix(mix(a0[2], b0[2], u0), '#3a3466', dark));
  ctx.fillStyle = sg;
  ctx.fillRect(-12, -12, w + 24, h + 24);
  if (dark > 0.2)
    for (let k = 0; k < 46; k++) {
      ctx.globalAlpha = (dark - 0.2) * (0.4 + 0.6 * Math.abs(Math.sin(s.t / 30 + k)));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(hsh(k * 3) * w, topH + hsh(k * 5 + 1) * (yB - topH - 30), 1.6, 1.6);
    }
  ctx.globalAlpha = 1;
  // 해·달
  {
    const sx = moon || s.phase === 'night' ? w * 0.78 : w * (0.1 + 0.8 * f), sy = moon || s.phase === 'night' ? topH + R(0.12) : topH + R(0.2) - Math.sin(Math.PI * Math.min(1, f)) * R(0.11);
    const col = moon || s.phase === 'night' ? '#fff4cc' : mix('#fff4b0', '#ff9a50', Math.max(0, f - 0.5) * 2);
    const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, R(0.13));
    gl.addColorStop(0, col);
    gl.addColorStop(0.28, col);
    gl.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.arc(sx, sy, R(0.13), 0, TAU);
    ctx.fill();
    if (moon || s.phase === 'night') ell(sx - R(0.012), sy - R(0.008), R(0.012), R(0.01), 'rgba(200,190,150,.5)'), ell(sx + R(0.014), sy + R(0.012), R(0.008), R(0.007), 'rgba(200,190,150,.5)');
  }
  // 구름 · 새
  for (let k = 0; k < 4; k++) {
    const cx = ((hsh(k + 11) * w + s.t * (0.08 + k * 0.03)) % (w + 120)) - 60, cy = topH + R(0.06) + hsh(k + 3) * R(0.14);
    ctx.fillStyle = `rgba(255,255,255,${0.7 - dark * 0.5})`;
    for (let p = 0; p < 4; p++) ell(cx + p * R(0.035) - R(0.05), cy - (p % 2) * R(0.012), R(0.042), R(0.022), ctx.fillStyle as string);
  }
  if (dark < 0.5) {
    ctx.strokeStyle = 'rgba(40,50,70,.55)';
    ctx.lineWidth = 1.3;
    for (let k = 0; k < 3; k++) {
      const bx = ((s.t * 0.45 + k * 41 + hsh(k) * 200) % (w + 80)) - 40, by = topH + R(0.1) + k * 9 + Math.sin(s.t / 20 + k) * 3, fl = Math.sin(s.t / 6 + k) * 3;
      ctx.beginPath();
      ctx.moveTo(bx - 5, by - fl);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + 5, by - fl);
      ctx.stroke();
    }
  }
  // 먼 언덕 (뒤 두 겹) + 작은 나무
  for (const [base, amp, col, ph] of [[yB - R(0.075), R(0.035), '#a8d89a', 0.4], [yB - R(0.03), R(0.025), '#86c46e', 2.1]] as [number, number, string, number][]) {
    ctx.fillStyle = mix(mix(col, '#c88a7a', Math.max(0, f - 0.7) * 1.5), '#1c2448', dark * 0.8);
    ctx.beginPath();
    ctx.moveTo(-10, yB + 10);
    for (let px = -10; px <= w + 10; px += 8) ctx.lineTo(px, base - amp * Math.sin(px / 55 + ph) - amp * 0.5 * Math.sin(px / 23 + ph * 2));
    ctx.lineTo(w + 10, yB + 10);
    ctx.fill();
  }
  for (let k = 0; k < 9; k++) {
    const tx = hsh(k * 7 + 2) * w, ty = yB - R(0.035) - hsh(k * 3) * R(0.02), sz = R(0.012) + hsh(k) * R(0.01);
    ell(tx, ty, sz, sz * 1.2, mix('#4f9a46', '#132a22', dark * 0.8));
    ctx.fillStyle = mix('#6a4a2a', '#1a1410', dark);
    ctx.fillRect(tx - 1, ty + sz * 0.9, 2, sz * 0.7);
  }
  // 판 바깥 들판 (디오라마가 놓인 너른 풀밭)
  {
    const mg = ctx.createLinearGradient(0, yB - R(0.02), 0, h);
    mg.addColorStop(0, mix('#a6d68a', '#1c2a30', dark * 0.8));
    mg.addColorStop(1, mix('#6fae58', '#121c1c', dark * 0.8));
    ctx.fillStyle = mg;
    ctx.fillRect(-12, yB - R(0.02), w + 24, h);
  }
  // ── 받침대·판 ──
  const FL = [X(XL, 0), yF], FR = [X(XR, 0), yF], BR = [X(XR, 1), yB], BL = [X(XL, 1), yB];
  ell(w / 2 + 6, yF + T + R(0.035), w * 0.5, R(0.02), 'rgba(10,20,10,.35)');
  {
    const ex = 5, pd = R(0.028), y0 = yF + T;
    poly([[FL[0] - ex, y0], [FR[0] + ex, y0], [FR[0] + ex, y0 + pd], [FL[0] - ex, y0 + pd]], mix('#a06a3e', '#2a1a10', dark * 0.6));
    poly([[FR[0] + ex, y0], [BR[0] + ex, yB + T], [BR[0] + ex, yB + T + pd], [FR[0] + ex, y0 + pd]], mix('#7a4e2c', '#20140c', dark * 0.6));
    ctx.strokeStyle = 'rgba(255,220,170,.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(FL[0] - ex, y0 + 1);
    ctx.lineTo(FR[0] + ex, y0 + 1);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(60,30,10,.25)';
    for (let k = 1; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(FL[0], y0 + (pd * k) / 3);
      ctx.bezierCurveTo(w * 0.3, y0 + (pd * k) / 3 + 2, w * 0.6, y0 + (pd * k) / 3 - 2, FR[0], y0 + (pd * k) / 3);
      ctx.stroke();
    }
  }
  // 흙 단면 (앞·옆)
  const bands = [[0, 0.12, '#5aa83a'], [0.12, 0.45, '#9a6a40'], [0.45, 0.75, '#7c5232'], [0.75, 1, '#5e3c24']] as [number, number, string][];
  for (const [q0, q1, col] of bands) {
    poly([[FL[0], yF + T * q0], [FR[0], yF + T * q0], [FR[0], yF + T * q1], [FL[0], yF + T * q1]], mix(col, '#1a1410', dark * 0.6));
    poly([[FR[0], yF + T * q0], [BR[0], yB + T * q0], [BR[0], yB + T * q1], [FR[0], yF + T * q1]], mix(mix(col, '#000000', 0.25), '#1a1410', dark * 0.6));
  }
  for (let k = 0; k < 16; k++) ell(FL[0] + hsh(k * 9) * (FR[0] - FL[0]), yF + T * (0.5 + hsh(k * 4) * 0.4), 1.6 + hsh(k) * 1.5, 1.1, mix('#b89a7a', '#2a2018', dark * 0.6));
  // 풀밭 윗면
  const gg = ctx.createLinearGradient(0, yB, 0, yF);
  gg.addColorStop(0, mix('#a8dc78', '#1e3424', dark * 0.75));
  gg.addColorStop(1, mix('#78c858', '#183020', dark * 0.75));
  poly([FL, FR, BR, BL], gg);
  for (let k = 0; k < 15; k++) {
    if (k % 2) continue;
    const x0 = XL + k, x1 = Math.min(XR, x0 + 1);
    ctx.globalAlpha = 0.12;
    poly([[X(x0, 0), yF], [X(x1, 0), yF], [X(x1, 1), yB], [X(x0, 1), yB]], '#ffffff');
  }
  ctx.globalAlpha = 1;
  // 흙길 (알이 굴러가는 길)
  {
    const z0 = LZ - 0.12, z1 = LZ + 0.12, x0 = 1.3;
    poly([[X(x0, z0), Y(z0, 0)], [X(XR, z0), Y(z0, 0)], [X(XR, z1), Y(z1, 0)], [X(x0 + 0.3, z1), Y(z1, 0)]], mix('#dcbf8c', '#3a3226', dark * 0.7));
    ctx.strokeStyle = mix('#b8965e', '#2a241a', dark * 0.7);
    ctx.lineWidth = 1;
    for (const zz of [LZ - 0.05, LZ + 0.05]) {
      ctx.beginPath();
      ctx.moveTo(X(x0 + 0.4, zz), Y(zz, 0));
      ctx.lineTo(X(XR, zz), Y(zz, 0));
      ctx.stroke();
    }
    for (let k = 0; k < 14; k++) ell(X(x0 + 0.6 + hsh(k * 5) * (XR - x0 - 1), LZ + (hsh(k * 7) - 0.5) * 0.2), Y(LZ, 0) + (hsh(k * 7) - 0.5) * 0.2 * -D, 1.6, 1, mix('#a08060', '#2a2018', dark));
  }
  // 꽃·풀포기 (길 밖)
  for (let k = 0; k < 40; k++) {
    const gx = XL + 0.2 + hsh(k * 13) * (XR - XL - 0.4), gz = hsh(k * 17 + 5);
    if (Math.abs(gz - LZ) < 0.16 || (gx < 3.4 && gz < 0.34)) continue;
    const x = X(gx, gz), y = Y(gz, 0);
    ctx.strokeStyle = mix('#4f9a30', '#14281a', dark * 0.7);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 1.5, y);
    ctx.lineTo(x - 0.5, y - 3.5);
    ctx.moveTo(x + 1, y);
    ctx.lineTo(x + 1.6, y - 3);
    ctx.stroke();
    if (k % 3 === 0) ell(x, y - 4, 1.8, 1.8, mix(['#ffffff', '#ffd84a', '#ff8ab0'][k % 9 === 0 ? 2 : (k / 3) % 2], '#333344', dark * 0.7));
  }
  // ── 뒤쪽: 울타리 줄 · 헛간 · 사일로 · 닭장 · 풍향 깃발 · 연못 ──
  {
    const zz = 0.98;
    ctx.strokeStyle = mix('#a8743e', '#2a1c10', dark * 0.7);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const hh of [0.3, 0.62]) (ctx.moveTo(X(XL + 0.2, zz), Y(zz, hh)), ctx.lineTo(X(XR - 0.2, zz), Y(zz, hh)));
    ctx.stroke();
    ctx.fillStyle = mix('#8a5a30', '#24180c', dark * 0.7);
    for (let gx = XL + 0.2; gx < XR - 0.1; gx += 1.1) ctx.fillRect(X(gx, zz) - 1.5, Y(zz, 0.8), 3, S * 0.8);
  }
  if (s.seen.has('pond')) drawPond(4.6, 0.84);
  if (s.seen.has('silo')) drawSilo(12.9, 0.92);
  if (s.seen.has('barn')) drawBarn(11.4, 0.85);
  if (s.seen.has('silo')) for (let k = 0; k < 3; k++) drawSheep(9.2 + k * 0.9 + Math.sin(s.t / 90 + k * 2) * 0.3, 0.74 + (k % 2) * 0.06, k);
  if (c.wind) drawSock(6.6, 0.93);
  drawCoop(1.9, 0.86);
  if (!c.cow) {
    // 구경꾼 소: 뒤 풀밭에서 되새김질, 병아리가 태어나면 음매~, 깨지면 음매?
    const gx = 9.4 + Math.sin(s.t / 300) * 0.8, rg = s.t - s.lastGood, rb = s.t - s.lastBad;
    drawCowAt(X(gx, 0.88), Y(0.88, 0), Math.cos(s.t / 300) >= 0 ? 1 : -1, 0.72, Math.min(rg, rb) < 26 ? Math.min(rg, rb) : 99, rg < 50 ? '음매~♪' : rb < 50 ? '음매?' : '', false);
  }
  if (c.mill) drawMillTower();
  // ── 길 위: 둥지 · 울타리 · 소 · 트랙터 · 여우 · 풍차 · 암탉 ──
  for (let i = 0; i < s.nests.length; i++) if (s.nests[i].kind === 0) drawNest(i);
  for (const fe of c.fences) (fe.hay ? drawHay(fe) : drawFence(fe));
  if (c.tractor) drawTractor();
  if (c.cow) drawCow();
  if (c.fox && s.fox.mode > 0) drawFox();
  if (c.mill) drawMillBlades();
  drawBale();
  // 지난 알 자국 (다음 발 맞추기)
  if (s.trail.length > 2 && s.phase === 'day') {
    ctx.fillStyle = `rgba(255,255,255,${0.35 - dark * 0.15})`;
    for (let i = 2; i < s.trail.length; i += 4) {
      ctx.beginPath();
      ctx.arc(LX(s.trail[i]), LY(s.trail[i + 1]), 1.3, 0, TAU);
      ctx.fill();
    }
  }
  // 조준: 누르는 중엔 점선 안내(앞부분·바람 빼고), 아니면 지금 기울기 화살표
  const ang = angleAt(s, T0), canShoot = s.phase === 'day' && s.left > 0 && s.endAt < 0;
  if (s.charge > 0 && s.phase === 'day') {
    const pts: number[] = [], gold = c.gold && s.shot % 3 === 2;
    const r = shoot(s, T0, ang, s.charge, gold, 0, null, true, GUIDE, true, pts);
    const n = pts.length / 2;
    for (let i = 0; i < n; i++) {
      const al = 1 - (i / n) * 0.65, x = LX(pts[i * 2]), y = LY(pts[i * 2 + 1]);
      ctx.fillStyle = `rgba(40,20,10,${0.5 * al})`;
      ctx.beginPath();
      ctx.arc(x, y, 3.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${al})`;
      ctx.beginPath();
      ctx.arc(x, y, 2.3, 0, TAU);
      ctx.fill();
    }
    if (n) {
      const x = LX(pts[n * 2 - 2]), y = LY(pts[n * 2 - 1]), pulse = 1 + 0.15 * Math.sin(s.t / 4);
      ctx.lineWidth = 2.5;
      if (r === NEST) {
        ctx.strokeStyle = '#7dff7a';
        ctx.shadowColor = '#7dff7a';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(x, y, S * 0.7 * pulse, S * 0.32 * pulse, 0, 0, TAU);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (r === BOUNCE) {
        ctx.font = `900 ${R(0.036)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(60,30,0,.7)';
        ctx.strokeText('통?', x, y - 12);
        ctx.fillStyle = '#ffd27a';
        ctx.fillText('통?', x, y - 12);
      } else if (r !== FLY) {
        ctx.strokeStyle = '#ff5a4a';
        ctx.beginPath();
        ctx.moveTo(x - 5, y - 5);
        ctx.lineTo(x + 5, y + 5);
        ctx.moveTo(x + 5, y - 5);
        ctx.lineTo(x - 5, y + 5);
        ctx.stroke();
      }
    }
  } else if (canShoot && s.cool === 0) {
    const x0 = LX(HX), y0 = LY(HY), dx = Math.cos(ang), dy = -Math.sin(ang), L = S * (1.5 + 0.1 * Math.sin(s.t / 5));
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 4]);
    ctx.lineDashOffset = -s.t * 0.5;
    ctx.beginPath();
    ctx.moveTo(x0 + dx * S * 0.4, y0 + dy * S * 0.4);
    ctx.lineTo(x0 + dx * L, y0 + dy * L);
    ctx.stroke();
    ctx.setLineDash([]);
    poly([[x0 + dx * (L + 7), y0 + dy * (L + 7)], [x0 + dx * L - dy * 4.5, y0 + dy * L + dx * 4.5], [x0 + dx * L + dy * 4.5, y0 + dy * L - dx * 4.5]], 'rgba(255,255,255,.95)');
  }
  drawHen();
  // 날아가는 알 (땅에 그림자)
  for (const e of s.eggs) {
    const x = LX(e.x), y = LY(e.y), sh = Math.max(0.25, 1 - e.y / 9);
    ell(x, LY(0), S * 0.22 * sh, S * 0.08 * sh, `rgba(0,0,0,${0.25 * sh})`);
    drawEgg(x, y, S * 0.27, e.spin, e.gold);
  }
  // ── 앞: 마당의 어미닭·병아리 · 길 잃은 병아리 ──
  drawYard();
  for (const l of s.lost) {
    const age = s.t - l.t, gx = l.x + 0.5 * Math.sin(age / 55 + l.d) + Math.min(1, age / 60) * 0.25 * Math.cos(l.d), gz = LZ - 0.13 + 0.05 * Math.sin(age / 37 + l.d * 2);
    const x = X(gx, gz), y = Y(gz, 0), dir = Math.cos(age / 55 + l.d) >= 0 ? 1 : -1, pop = Math.min(1, age / 10);
    chick(x, y - (1 - pop) * 10, S * 0.24, { hat: true, dir, hop: Math.abs(Math.sin(age / 7)) * 2, dizzy: age < 90 });
    if ((age + Math.floor(l.d * 40)) % 200 < 55) bubble(x, y - S * 0.95, age < 120 ? '삐약?' : '삐…약?', R(0.032));
  }
  // ── 밤: 오늘 병아리가 닭장으로 줄줄이 ──
  if (s.phase === 'night') {
    const q = (NIGHT - s.pause) / NIGHT;
    let i = 0;
    for (const n of s.nests)
      for (const v of n.vals) {
        nestPos(s, n, T0);
        const p = Math.max(0, Math.min(1, (q - 0.08 - i * 0.03) * 2.2)), gx = NX + (0.6 - NX) * p, hg = n.kind === 0 ? 0 : NY * (1 - p);
        if (p > 0 && p < 1) chick(LX(gx), LY(hg) - Math.abs(Math.sin(p * 18)) * 5, S * 0.26, { dir: -1, gold: v >= 4 });
        i++;
      }
  }
  // ── 노을·밤 + 불빛 ──
  if (dusk > 0.01) {
    ctx.fillStyle = `rgba(16,18,58,${dusk})`;
    ctx.fillRect(-12, -12, w + 24, h + 24);
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, r, col] of lights) {
      const gl = ctx.createRadialGradient(x, y, 0, x, y, r);
      gl.addColorStop(0, col);
      gl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // 반딧불
    for (let k = 0; k < 10; k++) {
      const gx = XL + hsh(k * 31) * (XR - XL), gz = 0.2 + hsh(k * 7) * 0.7, hh = 0.5 + Math.sin(s.t / 40 + k) * 0.4 + hsh(k) * 1.5;
      ctx.fillStyle = `rgba(220,255,120,${dusk * (0.5 + 0.5 * Math.sin(s.t / 9 + k * 2))})`;
      ctx.beginPath();
      ctx.arc(X(gx + Math.sin(s.t / 60 + k) * 0.5, gz), Y(gz, hh), 1.8, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  // ── 연출 (사건마다) ──
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = LX(e.x), y = LY(e.y);
    if (e.kind === 'fire') fx.burst(x, y, '#fff8e8', 14, 3, 2.5), fx.ring(x, y, '#ffffff', S * 1.3, 3), fx.pop(x + 18, y - 8, e.text!, '#ffffff', 18), fx.kick(2 + s.lastPow * 5);
    else if (e.kind === 'over') fx.burst(x, y, '#ff6a50', 24, 4.5, 3), fx.burst(x, y, '#ffffff', 16, 3, 3), fx.pop(x + 24, y - 24, e.text!, '#ff6a5a', 22), fx.kick(9), fx.blink('#ff8060', 0.2);
    else if (e.kind === 'land') fx.ring(x, y, '#ffe27a', S * 1.4, 3), fx.burst(x, y, '#f7d98a', 10, 2, 2), fx.pop(x, y - 16, e.text!, '#ffffff', 16);
    else if (e.kind === 'hatch') fx.burst(x, y - 6, '#ffe14a', 14 + (e.n ?? 1) * 6, 3, 2.6), fx.ring(x, y - 4, '#fff3a0', S * (1.4 + (e.n ?? 1) * 0.3), 4), fx.pop(x, y - S * 1.7, e.text!, '#ffb02e', (e.n ?? 1) >= 2 ? 19 : 17), fx.kick((e.n ?? 1) >= 3 ? 5 : 2);
    else if (e.kind === 'bounce') fx.burst(x, y, '#ffffff', 8, 2.5, 2), fx.pop(x, y - 14, '통!', '#ffd0a0', 17), fx.kick(3);
    else if (e.kind === 'break') fx.burst(x, y, '#ffe066', 14, 3, 2.6), fx.burst(x, y, '#ffffff', 8, 2.5, 2), fx.pop(x, y - 14, e.text!, '#ffb0a0', 16), fx.kick(3);
    else if (e.kind === 'out') fx.pop(Math.min(w - 40, x), Math.max(topH + 24, y), e.text!, '#cfe8ff', 15);
    else if (e.kind === 'foxhit') fx.burst(x, y, '#ffe066', 18, 3.5, 3), fx.pop(x, y - 20, e.text!, '#ffd27a', 19), fx.kick(6);
    else if (e.kind === 'steal') fx.pop(x, y - 18, '삐약!!', '#ff9a8a', 17), fx.kick(5), fx.blink('#ff6040', 0.15);
    else if (e.kind === 'foxin') fx.pop(Math.min(w - 30, x), y - 10, e.text!, '#ffb070', 14);
    else if (e.kind === 'clear') fx.burst(w / 2, h * 0.36, '#ffd23f', 60, 6, 3), fx.blink('#fff6c8', 0.25), fx.pop(w / 2, h * 0.34, e.text!, '#ffe27a', 24);
    else if (e.kind === 'fail') fx.kick(10), fx.blink('#ff4d5e', 0.25), fx.pop(w / 2, h * 0.36, e.text!, '#ff8a8a', 17);
    else if (e.kind === 'perfect') fx.burst(w / 2, h * 0.44, '#c8ff9a', 30, 4, 2.5), fx.pop(w / 2, h * 0.44, e.text!, '#d8ffb0', 16);
    else if (e.kind === 'tap') fx.pop(x, y, e.text!, '#ffffff', 14);
  }
  fx.memo.t = s.t;
  // 누르는 중: 세기 온도계 (넘치면 빨갛게 깜빡 — 곧 꼬꼬댁!)
  if (s.charge > 0) {
    const p = Math.min(1, s.charge / FULL), ov = s.charge > FULL ? (s.charge - FULL) / (OVER - FULL) : 0;
    const g0 = LX(-1.0), gy = LY(3.6), gh = LX(0.8) - g0;
    if (s.t % 6 === 0) fx.kick(0.6 + p * 1.6 + ov * 3);
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath();
    ctx.roundRect(g0, gy - 6, gh, 12, 6);
    ctx.fill();
    const gr = ctx.createLinearGradient(g0, 0, g0 + gh, 0);
    gr.addColorStop(0, '#8be05a');
    gr.addColorStop(0.6, '#ffd23f');
    gr.addColorStop(1, '#ff4a2a');
    ctx.fillStyle = ov > 0 && s.t % 8 < 4 ? '#ff3a2a' : gr;
    ctx.shadowColor = '#ffb040';
    ctx.shadowBlur = 6 + p * 8;
    ctx.beginPath();
    ctx.roundRect(g0 + 2, gy - 4, (gh - 4) * p, 8, 4);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();

  // ───────── HUD ─────────
  const hg = ctx.createLinearGradient(0, 0, 0, topH);
  hg.addColorStop(0, 'rgba(40,30,14,.86)');
  hg.addColorStop(1, 'rgba(40,30,14,.62)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, w, topH);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  ctx.font = `900 ${R(0.04)}px system-ui, sans-serif`;
  ctx.fillText(`${s.phase === 'night' || moon ? '🌙' : '☀️'} ${s.day + 1}일째/${DAYS} · ${c.name}`, 8, R(0.034));
  ctx.textAlign = 'right';
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - 8, R(0.034));
  ctx.fillStyle = '#ffd23f';
  ctx.fillText(`★${s.stars}`, w - 8 - R(0.15), R(0.034));
  {
    // 병아리 목표 막대 (★·★★·★★★ 눈금)
    const g = c.goal, bx = 8, bw = w - 16, by = R(0.072), bh = R(0.04), max = g[2] * 1.12, at = (q: number) => bw * Math.max(0, Math.min(1, q / max));
    const v = Math.max(0, s.dayChicks), ok = v >= g[0];
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = ok ? '#8be05a' : '#ffc93c';
    ctx.beginPath();
    ctx.roundRect(bx, by, Math.max(bh, at(v)), bh, bh / 2);
    ctx.fill();
    ctx.font = `900 ${R(0.032)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      const gx = bx + at(g[i]);
      ctx.fillStyle = 'rgba(30,20,10,.7)';
      ctx.fillRect(gx - 1, by, 2, bh);
      ctx.fillStyle = v >= g[i] ? '#ffd23f' : 'rgba(255,255,255,.6)';
      ctx.fillText('★'.repeat(i + 1), Math.min(w - 8 - i * 6, gx), by + bh + R(0.017));
    }
    ctx.fillStyle = '#2a1a0a';
    ctx.textAlign = 'left';
    ctx.font = `900 ${R(0.032)}px system-ui, sans-serif`;
    ctx.fillText(`🐣 ${v} / ${g[0]}${ok ? ' ✓' : ''}`, bx + 8, by + bh / 2 + 1);
  }
  // 아래 띠: 남은 알 · 바람 · 어미닭
  ctx.fillStyle = 'rgba(40,30,14,.8)';
  ctx.fillRect(0, h - botH, w, botH);
  {
    const ey = h - botH / 2, er = R(0.017);
    for (let k = 0; k < s.total0; k++) {
      const used = k < s.shot, gold = c.gold && k % 3 === 2, x = 12 + k * er * 2.6;
      ctx.globalAlpha = used ? 0.25 : 1;
      drawEgg(x, ey, er, k === s.shot && s.charge > 0 ? Math.sin(s.t / 2) * 0.3 : 0, gold);
      if (k === s.shot && !used && s.phase === 'day') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, ey, er * 1.7, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'right';
    ctx.font = `800 ${R(0.032)}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffe9b8';
    const farm = s.hens + s.yardNew;
    let right = w - 8;
    if (c.wind) {
      const wv = s.wind / 0.0011, arrows = Math.max(1, Math.round(Math.abs(wv) * 3));
      const txt = `🍃 ${(wv < 0 ? '←' : '→').repeat(arrows)}`;
      ctx.fillText(txt, right, ey);
      right -= ctx.measureText(txt).width + 10;
    }
    if (farm > 0) ctx.fillText(`🐔 ${farm}`, right, ey);
  }
  // 새 소식 띠 (하늘 자리)
  let ny = topH + R(0.04);
  ctx.textAlign = 'center';
  for (const n of s.notes.slice(-3)) {
    const age = s.t - n.t, al = Math.min(1, (220 - age) / 30, age / 8);
    if (al <= 0) continue;
    ctx.globalAlpha = al;
    ctx.font = `800 ${R(0.033)}px system-ui, sans-serif`;
    const tw = Math.min(w - 8, ctx.measureText(n.text).width + 18);
    ctx.fillStyle = 'rgba(40,24,10,.66)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2, ny - R(0.025), tw, R(0.05), R(0.025));
    ctx.fill();
    ctx.fillStyle = n.color;
    ctx.fillText(n.text, w / 2, ny + 1, w - 16);
    ny += R(0.056);
  }
  ctx.globalAlpha = 1;
  // 첫 안내 · 밤 안내
  const hint = (t1: string, y: number) => {
    ctx.font = `900 ${R(0.04)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    const tw = Math.min(w - 10, ctx.measureText(t1).width + 22);
    ctx.fillStyle = 'rgba(40,24,10,.72)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2, y - R(0.03), tw, R(0.06), R(0.03));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(t1, w / 2, y + 1, w - 20);
  };
  if (s.day === 0 && s.shot === 0 && s.phase === 'day' && s.t > 15) hint(s.charge > 0 ? '점선이 둥지에 닿을 때 떼요!' : '👆 꾹 누르면 꼬꼬가 부풀어요 — 떼면 알이 퐁!', yB - R(0.16));
  else if (s.phase === 'night' && s.pause < NIGHT - 40) hint(s.retry ? `♥ ${s.hearts} — ${s.day + 1}일째 다시!` : s.day === DAYS - 1 ? '🏆 꼬꼬 농장 완성!' : `🌙 다음: ${s.day + 2}일째 ${DAYC[s.day + 1].name}`, yB - R(0.16));

  // ───────── 그리기 도우미 (판 좌표를 공유) ─────────
  function drawEgg(x: number, y: number, r: number, rot: number, gold: boolean) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const gr = ctx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r * 1.3);
    gr.addColorStop(0, gold ? '#fff7c0' : '#ffffff');
    gr.addColorStop(0.55, gold ? '#ffd23a' : '#fbf2e2');
    gr.addColorStop(1, gold ? '#c88a10' : '#d9c8ac');
    if (gold) (ctx.shadowColor = '#ffd23a'), (ctx.shadowBlur = 10);
    ell(0, 0, r * 0.82, r * 1.05, gr);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  function chick(x: number, y: number, r: number, o: { hat?: boolean; dir?: number; hop?: number; gold?: boolean; dizzy?: boolean; peep?: boolean }) {
    const dir = o.dir ?? 1, yy = y - (o.hop ?? 0);
    ell(x, y + 0.5, r * 0.85, r * 0.3, 'rgba(0,0,0,.22)');
    ctx.strokeStyle = '#e8902a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.3, yy - r * 0.2);
    ctx.lineTo(x - r * 0.35, y);
    ctx.moveTo(x + r * 0.25, yy - r * 0.2);
    ctx.lineTo(x + r * 0.3, y);
    ctx.stroke();
    const gr = ctx.createRadialGradient(x - r * 0.3, yy - r * 1.4, r * 0.15, x, yy - r, r * 1.15);
    gr.addColorStop(0, o.gold ? '#fffbe0' : '#fff7b0');
    gr.addColorStop(0.6, o.gold ? '#ffd030' : '#ffd93b');
    gr.addColorStop(1, o.gold ? '#d89a10' : '#eab020');
    if (o.gold) (ctx.shadowColor = '#ffe060'), (ctx.shadowBlur = 8);
    ell(x, yy - r, r, r * 0.96, gr);
    ctx.shadowBlur = 0;
    ell(x - dir * r * 0.2, yy - r * 0.85, r * 0.42, r * 0.28, o.gold ? '#f0b818' : '#f4c42a', -dir * 0.3);
    if (o.dizzy) {
      ctx.strokeStyle = '#3a2210';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x + dir * r * 0.35, yy - r * 1.22, r * 0.14, 0, TAU * 0.75);
      ctx.stroke();
    } else ell(x + dir * r * 0.35, yy - r * 1.22, r * 0.12, r * 0.14, '#2a1a10');
    poly([[x + dir * r * 0.75, yy - r * 1.12], [x + dir * r * 1.15, yy - r * 0.98], [x + dir * r * 0.75, yy - r * 0.86]], '#ff8a1a');
    if (o.hat) {
      ctx.fillStyle = '#fffaf0';
      ctx.beginPath();
      ctx.moveTo(x - r * 0.8, yy - r * 1.55);
      ctx.quadraticCurveTo(x, yy - r * 2.6, x + r * 0.8, yy - r * 1.55);
      for (let q = 0; q <= 6; q++) ctx.lineTo(x + r * 0.8 - (q * r * 1.6) / 6, yy - r * (q % 2 ? 1.75 : 1.5));
      ctx.fill();
      ctx.strokeStyle = 'rgba(150,120,90,.6)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }
  function nestShape(x: number, y: number, rw: number, mult: number, glow: number) {
    // (x, y) = 테두리 가운데. 짚을 엮은 그릇 + 금테(쌍둥이)
    ell(x + 2, y + rw * 0.42, rw * 1.05, rw * 0.3, 'rgba(0,0,0,.25)');
    const bg = ctx.createLinearGradient(0, y - rw * 0.2, 0, y + rw * 0.45);
    bg.addColorStop(0, mix('#c8904a', '#3a2814', dark * 0.6));
    bg.addColorStop(1, mix('#8a5a2a', '#24180c', dark * 0.6));
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(x - rw, y);
    ctx.quadraticCurveTo(x - rw * 0.9, y + rw * 0.5, x, y + rw * 0.5);
    ctx.quadraticCurveTo(x + rw * 0.9, y + rw * 0.5, x + rw, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = mix('#e8b86a', '#4a3820', dark * 0.6);
    ctx.lineWidth = 1;
    for (let q = 0; q < 4; q++) {
      ctx.beginPath();
      ctx.moveTo(x - rw * 0.9, y + q * rw * 0.1);
      ctx.quadraticCurveTo(x, y + rw * (0.2 + q * 0.1), x + rw * 0.9, y + q * rw * 0.1);
      ctx.stroke();
    }
    ell(x, y, rw, rw * 0.32, mix(mult > 1 ? '#f2c25a' : '#d9a85a', '#3a2c18', dark * 0.6));
    ell(x, y + 1, rw * 0.74, rw * 0.2, mix('#6b4423', '#20140a', dark * 0.6));
    if (mult > 1) {
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 1.8;
      ctx.shadowColor = '#ffd23f';
      ctx.shadowBlur = 4 + glow * 8;
      ctx.beginPath();
      ctx.ellipse(x, y, rw, rw * 0.32, 0, 0, TAU);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    if (moon) lights.push([x, y, rw * 2.2, 'rgba(255,220,120,.5)']);
  }
  function tag(x: number, y: number, mult: number) {
    ctx.font = `900 ${R(0.032)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const t = `×${mult}`, tw = ctx.measureText(t).width + 8;
    ctx.fillStyle = mult >= 3 ? '#e8452a' : '#d48a10';
    ctx.beginPath();
    ctx.roundRect(x - tw / 2, y - 8, tw, 16, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(t, x, y + 0.5);
  }
  function contents(n: Nest, x: number, y: number, rw: number) {
    // 알(흔들흔들 금이 감) → 병아리(삐약)
    for (let j = 0; j < n.vals.length; j++) {
      const age = T0 - n.at[j], v = n.vals[j], ox = (j - (n.vals.length - 1) / 2) * rw * 0.8;
      if (s.phase === 'day' && age < HATCH) {
        const wob = Math.sin(age * 0.9) * 0.25 * (age / HATCH);
        drawEgg(x + ox, y - rw * 0.12, rw * 0.36, wob, v >= 4 || (v >= 2 && n.mult === 1));
        if (age > HATCH * 0.5) {
          ctx.strokeStyle = '#7a5a3a';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + ox - rw * 0.2, y - rw * 0.3);
          ctx.lineTo(x + ox - rw * 0.05, y - rw * 0.18);
          ctx.lineTo(x + ox + rw * 0.1, y - rw * 0.32);
          ctx.stroke();
        }
      } else if (s.phase === 'day' || s.pause > NIGHT - 12) {
        const k = Math.min(3, v), bob = dance ? Math.abs(Math.sin(s.t / 6 + j)) * 4 : Math.abs(Math.sin(s.t / 12 + n.x * 3 + j)) * 1.5;
        for (let q = 0; q < k; q++) chick(x + ox + (q - (k - 1) / 2) * rw * 0.55, y + rw * 0.05, rw * 0.4, { dir: q % 2 ? -1 : 1, hop: bob + (q % 2) * 1.5, gold: v >= 4 });
        if (s.phase === 'day' && (s.t + Math.floor(n.x * 50)) % 260 < 40) bubble(x + ox, y - rw * 1.6, v >= 2 ? '삐약삐약' : '삐약', R(0.03));
      }
    }
  }
  function drawNest(i: number) {
    const n = s.nests[i];
    nestPos(s, n, T0);
    const x = LX(NX), y = LY(NY), rw = S * n.r * 1.25, free = n.vals.length < n.cap;
    nestShape(x, y, rw, n.mult, free ? 0.5 + 0.5 * Math.sin(s.t / 10 + i) : 0);
    contents(n, x, y, rw);
    if (n.mult > 1 && free) tag(x, y + rw * 0.9, n.mult);
  }
  function drawBale() {
    // 용수철 받침: 나무 발판 (판자 결 · 못)
    const x0 = -0.45, x1 = 0.85, z0 = LZ - 0.08, z1 = LZ + 0.08, hh = 0.16;
    ell(X(0.2, LZ - 0.1), Y(LZ - 0.1, 0) + 2, S * 0.85, S * 0.16, 'rgba(0,0,0,.2)');
    poly([[X(x0, z1), Y(z1, hh)], [X(x1, z1), Y(z1, hh)], [X(x1, z0), Y(z0, hh)], [X(x0, z0), Y(z0, hh)]], mix('#c8925a', '#3a2814', dark * 0.6));
    poly([[X(x0, z0), Y(z0, hh)], [X(x1, z0), Y(z0, hh)], [X(x1, z0), Y(z0, 0)], [X(x0, z0), Y(z0, 0)]], mix('#a06a3a', '#2a1c10', dark * 0.6));
    poly([[X(x1, z0), Y(z0, hh)], [X(x1, z1), Y(z1, hh)], [X(x1, z1), Y(z1, 0)], [X(x1, z0), Y(z0, 0)]], mix('#7a4e2a', '#20140c', dark * 0.6));
    ctx.strokeStyle = 'rgba(90,50,20,.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(X(x0, LZ), Y(LZ, hh));
    ctx.lineTo(X(x1, LZ), Y(LZ, hh));
    ctx.stroke();
    for (const gx of [x0 + 0.12, x1 - 0.12]) ell(X(gx, z0), Y(z0, hh * 0.5), 1.3, 1.3, '#4a3a30');
  }
  function drawHen() {
    const p = Math.min(1, s.charge / FULL), ov = s.charge > FULL ? (s.charge - FULL) / (OVER - FULL) : 0;
    const sinceFire = s.t - s.lastFire, good = s.t - s.lastGood < 70, bad = s.t - s.lastBad < 60 && !good;
    const shake = s.charge > 0 ? Math.sin(s.t * 1.7) * (0.4 + p * 1.2 + ov * 2.5) : 0, hop = dance ? Math.abs(Math.sin(s.t / 6)) * 4 : good && s.t - s.lastGood < 24 ? Math.sin(((s.t - s.lastGood) / 24) * Math.PI) * 5 : 0;
    const mx = LX(HX) + shake, my = LY(HY) - hop, rot = -(ang - ANG0) + (sinceFire < 10 ? 0.12 * (1 - sinceFire / 10) : 0);
    const u = S * 1.45, inf = 1 + 0.26 * p + ov * 0.06 * Math.sin(s.t * 1.4), recoil = sinceFire < 14 ? 1 - sinceFire / 14 : 0;
    const bx = -0.6 * u, by = 0.38 * u;
    // 용수철: 짚단 위에서 암탉 배까지 (기울면 늘었다 줄었다)
    const cs = Math.cos(rot), sn = Math.sin(rot), belly = [mx + (bx + 0.05 * u) * cs - (by + 0.5 * u * inf) * sn, my + (bx + 0.05 * u) * sn + (by + 0.5 * u * inf) * cs];
    const base = [X(0.2, LZ), Y(LZ, 0.14)];
    for (const [col, lw] of [[mix('#4a525e', '#1a1c22', dark * 0.5), 4], [mix('#c8d2dc', '#4a4e58', dark * 0.5), 2]] as [string, number][]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      for (let q = 0; q <= 10; q++) {
        const tq = q / 10, x = base[0] + (belly[0] - base[0]) * tq + (q % 2 ? 1 : -1) * S * 0.3 * (q > 0 && q < 10 ? 1 : 0), y = base[1] + (belly[1] - base[1]) * tq;
        if (q === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(rot);
    ctx.translate(bx, by);
    ctx.scale(inf * (1 + recoil * 0.12), inf * (1 - recoil * 0.14));
    // 꽁지깃 (알이 나오는 곳)
    const ta = Math.atan2(-by, -bx);
    for (let q = -1; q <= 1; q++) {
      const a = ta + q * 0.42 + (s.charge > 0 ? Math.sin(s.t / 3 + q) * 0.08 : 0);
      ctx.save();
      ctx.rotate(a);
      const fg = ctx.createLinearGradient(u * 0.4, 0, u * 1.05, 0);
      fg.addColorStop(0, mix('#fff3dc', '#5a5248', dark * 0.5));
      fg.addColorStop(1, mix('#c47a3a', '#3a2418', dark * 0.5));
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.ellipse(u * 0.72, 0, u * 0.34, u * 0.13, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    // 몸통
    const body = ctx.createRadialGradient(-u * 0.2, -u * 0.25, u * 0.1, 0, 0, u * 0.85);
    body.addColorStop(0, mix('#ffffff', '#6a6a78', dark * 0.5));
    body.addColorStop(0.6, mix('#f6ead6', '#5a5664', dark * 0.5));
    body.addColorStop(1, mix('#d8c2a0', '#3a3640', dark * 0.5));
    ell(0, 0, u * 0.7, u * 0.55, body, -0.22);
    if (p > 0.25)
      for (let q = 0; q < 12; q++) {
        const a = (q / 12) * TAU + s.t * 0.02, rr = u * 0.62, l = u * 0.12 * p;
        poly([[Math.cos(a - 0.15) * rr, Math.sin(a - 0.15) * rr * 0.8], [Math.cos(a) * (rr + l), Math.sin(a) * (rr + l) * 0.8], [Math.cos(a + 0.15) * rr, Math.sin(a + 0.15) * rr * 0.8]], mix('#fff6e6', '#5a5664', dark * 0.5));
      }
    if (ov > 0) ell(0, 0, u * 0.7, u * 0.55, `rgba(255,70,50,${0.25 + ov * 0.4})`, -0.22);
    // 날개 (누르면 번쩍 들림, 춤추면 파닥)
    ctx.save();
    ctx.translate(u * 0.08, -u * 0.02);
    ctx.rotate(-0.3 - p * 0.7 - (dance ? Math.abs(Math.sin(s.t / 5)) * 0.8 : 0) - recoil * 0.5);
    ell(u * 0.12, 0, u * 0.4, u * 0.22, mix('#ecd6b2', '#4a4650', dark * 0.5));
    ctx.strokeStyle = 'rgba(150,110,70,.5)';
    ctx.lineWidth = 1;
    for (let q = 0; q < 3; q++) {
      ctx.beginPath();
      ctx.moveTo(u * (0.05 + q * 0.1), -u * 0.1);
      ctx.quadraticCurveTo(u * (0.25 + q * 0.1), 0, u * (0.1 + q * 0.12), u * 0.16);
      ctx.stroke();
    }
    ctx.restore();
    // 머리 (앞을 보는 얼굴)
    const hx = -u * 0.62, hy = -u * 0.45, hr = u * 0.38;
    for (let q = -1; q <= 1; q++) ell(hx + q * hr * 0.42, hy - hr * 0.95 - (q === 0 ? hr * 0.12 : 0), hr * 0.26, hr * 0.3, mix('#ee3b2e', '#4a1a1a', dark * 0.4));
    const hg2 = ctx.createRadialGradient(hx - hr * 0.3, hy - hr * 0.3, hr * 0.1, hx, hy, hr * 1.1);
    hg2.addColorStop(0, mix('#ffffff', '#6a6a78', dark * 0.5));
    hg2.addColorStop(1, mix('#efe0c8', '#4a4652', dark * 0.5));
    ell(hx, hy, hr, hr * 0.95, hg2);
    if (ov > 0) ell(hx, hy, hr, hr * 0.95, `rgba(255,60,40,${0.2 + ov * 0.45})`);
    const ex = hr * 0.38, ey = hy - hr * 0.12, er = hr * 0.2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = 1.6;
    const strain = s.charge > 0 || (sinceFire < 8 && s.phase === 'day');
    for (const sd of [-1, 1]) {
      const x = hx + sd * ex;
      ctx.beginPath();
      if (strain) {
        ctx.moveTo(x - sd * er, ey - er * 0.8);
        ctx.lineTo(x + sd * er * 0.6, ey);
        ctx.lineTo(x - sd * er, ey + er * 0.8);
        ctx.stroke();
      } else if (dance || good || (sinceFire < 50 && s.phase === 'day')) {
        ctx.arc(x, ey + er * 0.4, er * 0.8, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      } else if (sad) {
        ctx.arc(x, ey - er * 0.4, er * 0.8, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      } else if (bad) {
        ell(x, ey, er * 1.25, er * 1.35, '#ffffff');
        ell(x, ey, er * 0.4, er * 0.45, '#1a1010');
      } else if (s.t % 160 < 6) {
        ctx.moveTo(x - er, ey);
        ctx.lineTo(x + er, ey);
        ctx.stroke();
      } else {
        ell(x, ey, er, er * 1.15, '#ffffff');
        ell(x + er * 0.35, ey + er * 0.1, er * 0.55, er * 0.6, '#1a1010');
      }
    }
    if (s.charge > 0 || good || dance) for (const sd of [-1, 1]) ell(hx + sd * hr * 0.62, hy + hr * 0.28, hr * 0.2, hr * 0.12, `rgba(255,110,110,${0.4 + p * 0.5})`);
    // 부리: 힘줄 땐 꽉, 쏠 땐 쩍, 놀라면 동그랗게
    const open = (sinceFire < 16 && s.phase === 'day') || bad ? 1 : 0, by0 = hy + hr * 0.22;
    poly([[hx - hr * 0.2, by0], [hx + hr * 0.2, by0], [hx, by0 + hr * (0.32 + open * 0.1)]], '#ffb21a');
    if (open) poly([[hx - hr * 0.16, by0 + hr * 0.22], [hx + hr * 0.16, by0 + hr * 0.22], [hx, by0 + hr * 0.55]], '#e08a10');
    ell(hx + hr * 0.05, by0 + hr * (0.55 + open * 0.2), hr * 0.12, hr * 0.18, mix('#e8352a', '#4a1a1a', dark * 0.4));
    ctx.lineCap = 'butt';
    ctx.restore();
    // 진땀 · 꼬꼬?! · 후~
    if (p > 0.6 || ov > 0) {
      const ph = (s.t % 26) / 26;
      ell(mx - u * 0.2, my - u * 0.6 + ph * 8, 1.8, 2.4, '#9fd8ff');
    }
    if (bad && s.t - s.lastBad < 50) bubble(mx - u * 0.9, my - u * 1.55, '꼬꼬?!', R(0.034));
    else if (ov > 0.3) bubble(mx - u * 0.9, my - u * 1.55, '끄으응…!', R(0.032), '#c02010');
    else if (sinceFire > 6 && sinceFire < 45 && s.phase === 'day') {
      ctx.globalAlpha = 1 - sinceFire / 45;
      ctx.font = `800 ${R(0.034)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('후~', mx - u * 1.0, my - u * 1.3 - sinceFire * 0.3);
      ctx.globalAlpha = 1;
    }
  }
  function hen(x: number, y: number, sz: number, k: number) {
    // 마당의 어미닭 (작게): 모이 쪼기
    const peck = Math.max(0, Math.sin(s.t / 18 + k * 1.7)) ** 6, dir = hsh(k * 3) < 0.5 ? -1 : 1;
    ell(x, y + 0.5, sz * 0.9, sz * 0.3, 'rgba(0,0,0,.22)');
    ell(x - dir * sz * 0.65, y - sz * 0.95, sz * 0.35, sz * 0.22, mix('#c8884a', '#3a2a1a', dark * 0.5), dir * 0.6);
    ell(x, y - sz * 0.6, sz * 0.75, sz * 0.55, mix('#fbf2e2', '#5a5664', dark * 0.5));
    const hx = x + dir * sz * 0.55, hy = y - sz * (1.1 - peck * 0.6);
    ell(hx, hy, sz * 0.32, sz * 0.32, mix('#ffffff', '#6a6a78', dark * 0.5));
    ell(hx, hy - sz * 0.32, sz * 0.14, sz * 0.14, '#ee3b2e');
    poly([[hx + dir * sz * 0.25, hy - sz * 0.05], [hx + dir * sz * 0.5, hy + sz * 0.05], [hx + dir * sz * 0.25, hy + sz * 0.12]], '#ffb21a');
    ell(hx + dir * sz * 0.1, hy - sz * 0.06, 1, 1.1, '#1a1010');
  }
  function drawYard() {
    const hens = Math.min(14, s.hens), kids = Math.min(14, s.yardNew), all = hens + kids;
    const spots: [number, number, number][] = [];
    for (let i = 0; i < all; i++) spots.push([-0.95 + hsh(i * 7 + 1) * (2.4 + Math.min(5, all * 0.2)) + 0.25 * Math.sin(s.t / (70 + (i % 5) * 9) + i), 0.06 + hsh(i * 13 + 2) * 0.26 + 0.03 * Math.cos(s.t / 80 + i), i]);
    spots.sort((p, q) => q[1] - p[1]);
    for (const [gx, gz, i] of spots) {
      const x = X(gx, gz), y = Y(gz, 0);
      if (i < hens) hen(x, y, S * 0.34, i);
      else chick(x, y, S * 0.2, { dir: hsh(i) < 0.5 ? -1 : 1, hop: dance ? Math.abs(Math.sin(s.t / 6 + i)) * 4 : Math.abs(Math.sin(s.t / 10 + i)) * 1.5 });
    }
  }
  function drawCoop(gx: number, gz: number) {
    const lvl2 = s.seen.has('coop2'), x = X(gx, gz), y = Y(gz, 0), wd = S * 1.5, ht = S * (lvl2 ? 1.9 : 1.2), dep = S * 0.5;
    ell(x + 4, y + 2, wd * 0.75, S * 0.2, 'rgba(0,0,0,.2)');
    // 앞면·옆면 (판자)
    poly([[x - wd / 2, y], [x + wd / 2, y], [x + wd / 2, y - ht], [x - wd / 2, y - ht]], mix('#c8763e', '#3a2414', dark * 0.6));
    poly([[x + wd / 2, y], [x + wd / 2 + dep * 0.5, y - dep * 0.4], [x + wd / 2 + dep * 0.5, y - ht - dep * 0.4], [x + wd / 2, y - ht]], mix('#9a5428', '#2a180c', dark * 0.6));
    ctx.strokeStyle = 'rgba(80,40,10,.4)';
    ctx.lineWidth = 1;
    for (let q = 1; q < 5; q++) {
      ctx.beginPath();
      ctx.moveTo(x - wd / 2 + (wd * q) / 5, y);
      ctx.lineTo(x - wd / 2 + (wd * q) / 5, y - ht);
      ctx.stroke();
    }
    // 지붕
    const rf = mix('#e0453a', '#4a1a18', dark * 0.5);
    poly([[x - wd / 2 - 4, y - ht], [x + wd / 2 + 4, y - ht], [x + wd * 0.1, y - ht - S * 0.75]], rf);
    poly([[x + wd / 2 + 4, y - ht], [x + wd / 2 + dep * 0.5 + 4, y - ht - dep * 0.4], [x + wd * 0.1 + dep * 0.5, y - ht - S * 0.75 - dep * 0.4], [x + wd * 0.1, y - ht - S * 0.75]], mix('#b0302a', '#3a1414', dark * 0.5));
    // 문 · 창 · 경사로
    const lit = dusk > 0.08;
    ctx.fillStyle = '#3a2010';
    ctx.beginPath();
    ctx.roundRect(x - wd * 0.15, y - S * 0.75, wd * 0.3, S * 0.75, [6, 6, 0, 0]);
    ctx.fill();
    ctx.fillStyle = lit ? '#ffd86a' : mix('#7ab8d8', '#2a3a4a', dark);
    for (const wy of lvl2 ? [y - S * 1.0, y - S * 1.55] : [y - S * 1.0]) ctx.fillRect(x + wd * 0.22, wy - S * 0.15, S * 0.25, S * 0.22);
    if (lit) lights.push([x + wd * 0.3, y - S * 1.0, S * 1.6, 'rgba(255,200,110,.75)']);
    poly([[x - wd * 0.12, y], [x + wd * 0.12, y], [x + wd * 0.2, y + S * 0.3], [x - wd * 0.2, y + S * 0.3]], mix('#a8743e', '#2a1a10', dark * 0.6));
    if (lvl2) {
      ctx.strokeStyle = mix('#8a5a2a', '#2a1a10', dark * 0.6);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - wd / 2, y - S * 1.25);
      ctx.lineTo(x + wd / 2, y - S * 1.25);
      ctx.stroke();
      // 깃발
      ctx.beginPath();
      ctx.moveTo(x + wd * 0.1, y - ht - S * 0.75);
      ctx.lineTo(x + wd * 0.1, y - ht - S * 1.35);
      ctx.stroke();
      poly([[x + wd * 0.1, y - ht - S * 1.35], [x + wd * 0.1 + S * 0.45 + Math.sin(s.t / 10) * 2, y - ht - S * 1.2], [x + wd * 0.1, y - ht - S * 1.05]], '#ffd23f');
    }
    // 지붕 위 고양이 (구경꾼): 알이 깨지면 펄쩍 '냥?!', 쌍둥이면 '냥~'
    const rb = s.t - s.lastBad, rg = s.t - s.lastGood, jump = rb < 20 ? Math.sin((rb / 20) * Math.PI) * 7 : 0;
    const kx = x - wd * 0.22, ky = y - ht - S * 0.42 - jump;
    emo('🐈', kx, ky, S * 0.8);
    if (rb < 45) bubble(kx, ky - S * 0.8, '냥?!', R(0.032));
    else if (rg < 40 && s.dayChicks >= 2) bubble(kx, ky - S * 0.8, '냥~', R(0.032));
  }
  function drawBarn(gx: number, gz: number) {
    const x = X(gx, gz), y = Y(gz, 0), wd = S * 2.2, ht = S * 1.5, dep = S * 0.7;
    ell(x + 5, y + 2, wd * 0.7, S * 0.25, 'rgba(0,0,0,.2)');
    poly([[x - wd / 2, y], [x + wd / 2, y], [x + wd / 2, y - ht], [x, y - ht - S * 0.9], [x - wd / 2, y - ht]], mix('#c8302a', '#3a1010', dark * 0.6));
    poly([[x + wd / 2, y], [x + wd / 2 + dep * 0.5, y - dep * 0.4], [x + wd / 2 + dep * 0.5, y - ht - dep * 0.4], [x + wd / 2, y - ht]], mix('#962420', '#2a0c0c', dark * 0.6));
    poly([[x - wd / 2 - 3, y - ht], [x, y - ht - S * 0.95], [x + dep * 0.5, y - ht - S * 0.95 - dep * 0.4], [x + wd / 2 + dep * 0.5 + 3, y - ht - dep * 0.4], [x + wd / 2 + 3, y - ht]], mix('#5a3a2a', '#1a100c', dark * 0.6));
    ctx.strokeStyle = mix('#ffffff', '#6a6a70', dark * 0.6);
    ctx.lineWidth = 1.6;
    ctx.strokeRect(x - wd * 0.22, y - S * 1.0, wd * 0.44, S * 1.0);
    ctx.beginPath();
    ctx.moveTo(x - wd * 0.22, y - S * 1.0);
    ctx.lineTo(x + wd * 0.22, y);
    ctx.moveTo(x + wd * 0.22, y - S * 1.0);
    ctx.lineTo(x - wd * 0.22, y);
    ctx.stroke();
    ctx.fillStyle = dusk > 0.08 ? '#ffd86a' : '#3a2010';
    ctx.fillRect(x - S * 0.18, y - ht - S * 0.35, S * 0.36, S * 0.3);
    if (dusk > 0.08) lights.push([x, y - ht - S * 0.2, S * 1.4, 'rgba(255,200,110,.7)']);
  }
  function drawSilo(gx: number, gz: number) {
    const x = X(gx, gz), y = Y(gz, 0), r = S * 0.45, ht = S * 2.3;
    const sg2 = ctx.createLinearGradient(x - r, 0, x + r, 0);
    sg2.addColorStop(0, mix('#e8eef2', '#4a4e58', dark * 0.6));
    sg2.addColorStop(1, mix('#8a96a2', '#22262e', dark * 0.6));
    ctx.fillStyle = sg2;
    ctx.fillRect(x - r, y - ht, r * 2, ht);
    ell(x, y - ht, r, r * 0.9, mix('#b8c4ce', '#3a3e48', dark * 0.6));
    ctx.strokeStyle = 'rgba(60,70,80,.35)';
    ctx.lineWidth = 1;
    for (let q = 1; q < 5; q++) {
      ctx.beginPath();
      ctx.moveTo(x - r, y - (ht * q) / 5);
      ctx.lineTo(x + r, y - (ht * q) / 5);
      ctx.stroke();
    }
  }
  function drawSheep(gx: number, gz: number, k: number) {
    const x = X(gx, gz), y = Y(gz, 0), sz = S * 0.3, dir = Math.cos(s.t / 90 + k * 2) >= 0 ? 1 : -1;
    ell(x, y + 0.5, sz * 1.1, sz * 0.3, 'rgba(0,0,0,.2)');
    ctx.fillStyle = '#3a3030';
    ctx.fillRect(x - sz * 0.5, y - sz * 0.5, 1.6, sz * 0.5);
    ctx.fillRect(x + sz * 0.4, y - sz * 0.5, 1.6, sz * 0.5);
    for (let q = 0; q < 5; q++) ell(x + (q - 2) * sz * 0.35, y - sz * (0.9 + (q % 2) * 0.2), sz * 0.45, sz * 0.4, mix('#fbfaf4', '#5a5a64', dark * 0.6));
    ell(x + dir * sz * 1.0, y - sz * 0.9, sz * 0.3, sz * 0.25, '#3a3030');
  }
  function drawPond(gx: number, gz: number) {
    const x = X(gx, gz), y = Y(gz, 0);
    ell(x, y, S * 1.3, S * 0.32, mix('#5ab8e0', '#1a3050', dark * 0.6));
    ell(x - S * 0.2, y - 1, S * 0.9, S * 0.18, `rgba(255,255,255,${0.25 - dark * 0.15})`);
    for (let k = 0; k < 3; k++) {
      const dx = Math.sin(s.t / 80 + k * 2) * S * 0.8, dy = Math.cos(s.t / 80 + k * 2) * S * 0.12;
      ell(x + dx, y + dy - 2, S * 0.16, S * 0.1, '#fbfaf0');
      ell(x + dx + S * 0.12, y + dy - 5, S * 0.08, S * 0.08, '#fbfaf0');
      poly([[x + dx + S * 0.18, y + dy - 5], [x + dx + S * 0.28, y + dy - 4], [x + dx + S * 0.18, y + dy - 3]], '#ffa020');
    }
  }
  function drawSock(gx: number, gz: number) {
    const x = X(gx, gz), y = Y(gz, 0), top = y - S * 2.3, wv = s.wind / 0.0011, len = S * (0.5 + Math.abs(wv) * 0.7), droop = (1 - Math.abs(wv)) * 0.9;
    ctx.strokeStyle = mix('#8a8a90', '#3a3a40', dark * 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, top);
    ctx.stroke();
    const dir = wv < 0 ? -1 : 1, flap = Math.sin(s.t / 4) * 2;
    for (let q = 0; q < 4; q++) {
      const a0x = x + dir * (len * q) / 4, a1x = x + dir * (len * (q + 1)) / 4, sy0 = top + droop * (len * q) / 4, sy1 = top + droop * (len * (q + 1)) / 4, r0 = S * 0.2 * (1 - q * 0.15), r1 = S * 0.2 * (1 - (q + 1) * 0.15);
      poly([[a0x, sy0 - r0], [a1x, sy1 - r1 + flap * (q / 4)], [a1x, sy1 + r1 + flap * (q / 4)], [a0x, sy0 + r0]], q % 2 ? '#ffffff' : '#ff5a3a');
    }
  }
  function drawFence(fe: Fence) {
    const z0 = LZ - 0.18, z1 = LZ + 0.18, col = mix('#b07a44', '#2a1c10', dark * 0.6), col2 = mix('#8a5a30', '#1e140a', dark * 0.6);
    const rail = (hh: number) => poly([[X(fe.x - 0.06, z1), Y(z1, hh)], [X(fe.x - 0.06, z0), Y(z0, hh)], [X(fe.x - 0.06, z0), Y(z0, hh - 0.22)], [X(fe.x - 0.06, z1), Y(z1, hh - 0.22)]], col);
    for (const zz of [z1, LZ, z0]) {
      const x = X(fe.x, zz), y = Y(zz, 0), pw = S * 0.14;
      if (zz === LZ) for (const hh of [fe.h * 0.32, fe.h * 0.66, fe.h * 0.98]) rail(hh);
      poly([[x - pw, y], [x + pw, y], [x + pw, y - fe.h * S], [x, y - fe.h * S - pw], [x - pw, y - fe.h * S]], col2);
      poly([[x - pw, y], [x, y], [x, y - fe.h * S - pw], [x - pw, y - fe.h * S]], col);
      if (moon && zz === z0) {
        ell(x, y - fe.h * S - pw - 4, 3.5, 4.5, '#ffcf5a');
        lights.push([x, y - fe.h * S - pw - 4, S * 1.8, 'rgba(255,190,90,.85)']);
      }
    }
  }
  function drawHay(fe: Fence) {
    const rows = Math.round(fe.h / 0.72);
    for (let r = 0; r < rows; r++) {
      const h0 = r * (fe.h / rows), h1 = (r + 1) * (fe.h / rows), x0 = fe.x - 0.42 + (r % 2) * 0.06, x1 = fe.x + 0.42 + (r % 2) * 0.06, z0 = LZ - 0.12, z1 = LZ + 0.12;
      poly([[X(x0, z0), Y(z0, h1)], [X(x1, z0), Y(z0, h1)], [X(x1, z1), Y(z1, h1)], [X(x0, z1), Y(z1, h1)]], mix('#f2d06a', '#4a3e1c', dark * 0.6));
      poly([[X(x0, z0), Y(z0, h1)], [X(x1, z0), Y(z0, h1)], [X(x1, z0), Y(z0, h0)], [X(x0, z0), Y(z0, h0)]], mix('#dcb048', '#3a3016', dark * 0.6));
      poly([[X(x1, z0), Y(z0, h1)], [X(x1, z1), Y(z1, h1)], [X(x1, z1), Y(z1, h0)], [X(x1, z0), Y(z0, h0)]], mix('#b88c2e', '#2a2210', dark * 0.6));
      ctx.strokeStyle = mix('#8a5a1a', '#1a1008', dark * 0.6);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(X(fe.x, z0), Y(z0, h0));
      ctx.lineTo(X(fe.x, z0), Y(z0, h1));
      ctx.stroke();
    }
  }
  function drawCow() {
    const hit = s.t - s.cowHit;
    drawCowAt(LX(cowX(s, T0)), LY(0), cowDir(s, T0), 1, hit, hit < 45 ? '음매?!' : '', true);
  }
  function drawCowAt(x: number, y0: number, dir: number, sc: number, hit: number, say: string, walking: boolean) {
    const jump = hit < 26 ? Math.sin((hit / 26) * Math.PI) * S * 0.35 * sc : 0, y = y0 - jump;
    ell(x, y0 + 1, S * CRX * 1.1 * sc, S * 0.18 * sc, 'rgba(0,0,0,.25)');
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    const u = S * sc, T0w = walking ? T0 : 0;
    // 다리
    ctx.fillStyle = mix('#f4f0ea', '#5a5860', dark * 0.5);
    for (const [lx, ph] of [[-0.55, 0], [-0.3, Math.PI], [0.35, Math.PI], [0.6, 0]] as [number, number][]) {
      const sw = Math.sin(T0w / 9 + ph) * 0.06;
      ctx.fillRect((lx + sw) * u - 2.2, -0.62 * u, 4.4, 0.62 * u);
      ell((lx + sw) * u, -1, 2.8, 1.8, '#3a3030');
    }
    // 몸통 (튕기는 곳) + 얼룩
    ell(0, -CY * u, CRX * u, CRY * u, mix('#fbf8f2', '#5a5860', dark * 0.5));
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, -CY * u, CRX * u, CRY * u, 0, 0, TAU);
    ctx.clip();
    for (const [px, py, pr] of [[-0.4, -1.1, 0.28], [0.25, -0.85, 0.24], [0.55, -1.2, 0.18], [-0.1, -1.32, 0.15]]) ell(px * u, py * u, pr * u, pr * u * 0.8, mix('#2a2424', '#101014', dark * 0.5));
    ctx.restore();
    ell(0.1 * u, -0.66 * u, 0.16 * u, 0.1 * u, mix('#ffb0c0', '#5a3a44', dark * 0.5));
    // 꼬리 살랑
    ctx.strokeStyle = mix('#e8e4de', '#4a4850', dark * 0.5);
    ctx.lineWidth = 1.6;
    const tw = Math.sin(s.t / 14) * 0.25;
    ctx.beginPath();
    ctx.moveTo(-0.82 * u, -1.1 * u);
    ctx.quadraticCurveTo(-1.05 * u, -0.9 * u, (-1.0 + tw) * u, -0.62 * u);
    ctx.stroke();
    ell((-1.0 + tw) * u, -0.6 * u, 2.5, 3.2, '#3a3030');
    // 머리 (되새김질 · 맞으면 눈 동그랗게)
    const hx = 0.95 * u, hy = -1.15 * u + Math.sin(T0 / 40) * 1.5, chew = Math.sin(s.t / 5) * 1.6;
    ell(hx - 0.1 * u, hy - 0.05 * u, 0.32 * u, 0.3 * u, mix('#fbf8f2', '#5a5860', dark * 0.5));
    ell(hx + 0.12 * u, hy + 0.14 * u + chew * 0.3, 0.24 * u, 0.17 * u, mix('#ffb8c4', '#5a3a44', dark * 0.5));
    ell(hx + 0.06 * u, hy + 0.13 * u + chew * 0.3, 1.3, 1.3, '#7a3a44');
    ell(hx + 0.2 * u, hy + 0.13 * u + chew * 0.3, 1.3, 1.3, '#7a3a44');
    ell(hx - 0.3 * u, hy - 0.22 * u, 0.14 * u, 0.07 * u, mix('#fbf8f2', '#5a5860', dark * 0.5), -0.4);
    ctx.strokeStyle = '#e8d8a8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx - 0.15 * u, hy - 0.3 * u);
    ctx.lineTo(hx - 0.2 * u, hy - 0.45 * u);
    ctx.moveTo(hx + 0.02 * u, hy - 0.3 * u);
    ctx.lineTo(hx + 0.05 * u, hy - 0.45 * u);
    ctx.stroke();
    if (hit < 45) (ell(hx - 0.05 * u, hy - 0.08 * u, 2.6, 2.8, '#ffffff'), ell(hx - 0.05 * u, hy - 0.08 * u, 1.1, 1.2, '#1a1010'));
    else {
      ctx.strokeStyle = '#2a1a10';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(hx - 0.05 * u, hy - 0.1 * u, 2.2, 0.1, Math.PI - 0.1);
      ctx.stroke();
    }
    // 방울
    ell(0.62 * u, -0.78 * u, 2.6, 2.6, '#ffd23f');
    ctx.restore();
    if (say) bubble(x + dir * S * 0.9 * sc, y - S * 1.95 * sc, say, R(0.034));
  }
  function drawTractor() {
    const tx = tractorX(s, T0), dir = tractorDir(s, T0), x = LX(tx), y = LY(0), u = S, cx = LX(tx - dir * CARTD);
    // 수레 (둥지 ×3)
    ell(cx, y + 1, u * 0.65, u * 0.15, 'rgba(0,0,0,.22)');
    ctx.strokeStyle = mix('#5a3a20', '#1a100a', dark * 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + dir * u * 0.5, y - u * 0.35);
    ctx.lineTo(x - dir * u * 0.5, y - u * 0.35);
    ctx.stroke();
    poly([[cx - u * 0.56, y - u * 0.25], [cx + u * 0.56, y - u * 0.25], [cx + u * 0.6, y - u * (CARTY - 0.05)], [cx - u * 0.6, y - u * (CARTY - 0.05)]], mix('#b8803e', '#2a1c10', dark * 0.6));
    ctx.strokeStyle = 'rgba(80,40,10,.45)';
    ctx.lineWidth = 1;
    for (let q = 1; q < 3; q++) {
      ctx.beginPath();
      ctx.moveTo(cx - u * 0.56, y - u * (0.25 + q * 0.18));
      ctx.lineTo(cx + u * 0.56, y - u * (0.25 + q * 0.18));
      ctx.stroke();
    }
    for (const wx of [-0.32, 0.32]) wheel(cx + wx * u, y - u * 0.2, u * 0.2, T0 * TRV * 5 * dir);
    const cart = s.nests.find((n) => n.kind === 1)!;
    const rw = S * cart.r * 1.25;
    nestShape(cx, LY(CARTY), rw, 3, cart.vals.length < cart.cap ? 1 : 0);
    contents(cart, cx, LY(CARTY), rw);
    if (cart.vals.length < cart.cap) tag(cx, LY(CARTY) - rw * 1.1, 3);
    // 트랙터
    ell(x, y + 1, u * 0.8, u * 0.18, 'rgba(0,0,0,.25)');
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    const red = mix('#e8402e', '#4a1410', dark * 0.5), red2 = mix('#b02a1e', '#300c08', dark * 0.5);
    poly([[-u * 0.1, -u * 0.35], [u * 0.72, -u * 0.35], [u * 0.72, -u * 0.8], [-u * 0.1, -u * 0.85]], red);
    poly([[-u * 0.62, -u * 0.4], [0, -u * 0.4], [0, -u * 1.25], [-u * 0.62, -u * 1.25]], red2);
    ctx.fillStyle = mix('#bfe6ff', '#2a3a50', dark * 0.6);
    ctx.fillRect(-u * 0.52, -u * 1.15, u * 0.42, u * 0.4);
    ctx.fillStyle = '#3a2a2a';
    ctx.fillRect(-u * 0.7, -u * 1.33, u * 0.8, u * 0.1);
    ctx.fillStyle = '#5a5a5a';
    ctx.fillRect(u * 0.5, -u * 1.15, u * 0.08, u * 0.35);
    for (let q = 0; q < 3; q++) {
      const ph = ((s.t + q * 18) % 54) / 54;
      ell(u * 0.54 - ph * u * 0.4, -u * 1.2 - ph * u * 0.7, 2 + ph * 4, 2 + ph * 4, `rgba(200,200,200,${0.6 * (1 - ph)})`);
    }
    ctx.restore();
    wheel(x - dir * u * 0.3, y - u * 0.45, u * 0.45, T0 * TRV * 2.2 * dir);
    wheel(x + dir * u * 0.5, y - u * 0.24, u * 0.24, T0 * TRV * 4 * dir);
    emo('🐶', x - dir * u * 0.31, y - u * 0.95, u * 0.5);
    if (dusk > 0.05) lights.push([x + dir * u * 0.75, y - u * 0.6, S * 1.6, 'rgba(255,240,170,.7)']);
  }
  function wheel(x: number, y: number, r: number, a: number) {
    ell(x, y, r, r, '#2a2424');
    ell(x, y, r * 0.55, r * 0.55, mix('#f2c23a', '#4a3a10', dark * 0.5));
    ctx.strokeStyle = '#2a2424';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let q = 0; q < 3; q++) (ctx.moveTo(x, y), ctx.lineTo(x + Math.cos(a + (q * TAU) / 3) * r * 0.55, y + Math.sin(a + (q * TAU) / 3) * r * 0.55));
    ctx.stroke();
  }
  function drawFox() {
    const fo = s.fox, x = LX(fo.x), y = LY(0), u = S * 1.35, run = fo.mode >= 2, dir = run ? 1 : -1, step = Math.sin(s.t / (run ? 3 : 6));
    ell(x, y + 1, u * 0.6, u * 0.14, 'rgba(0,0,0,.25)');
    ctx.save();
    ctx.translate(x, y - (run ? Math.abs(step) * 3 : 0));
    ctx.scale(dir, 1);
    const or = mix('#f07a28', '#4a2410', dark * 0.5);
    // 꼬리
    ctx.fillStyle = or;
    ctx.beginPath();
    ctx.moveTo(-u * 0.35, -u * 0.45);
    ctx.quadraticCurveTo(-u * 1.1, -u * (0.5 + step * 0.05), -u * 1.0, -u * 0.95);
    ctx.quadraticCurveTo(-u * 0.7, -u * 0.6, -u * 0.3, -u * 0.6);
    ctx.fill();
    ell(-u * 0.98, -u * 0.9, u * 0.14, u * 0.12, '#fff6ea');
    // 다리 · 몸
    ctx.fillStyle = '#3a2418';
    for (const lx of [-0.25, -0.1, 0.2, 0.32]) ctx.fillRect(lx * u + step * 2 * (lx > 0 ? 1 : -1), -u * 0.32, 2.6, u * 0.32);
    ell(0, -u * 0.48, u * 0.45, u * 0.22, or);
    ell(u * 0.05, -u * 0.4, u * 0.3, u * 0.1, '#fff0e0');
    // 머리
    const hx = u * 0.5, hy = -u * 0.68;
    poly([[hx - u * 0.18, hy - u * 0.1], [hx - u * 0.1, hy - u * 0.42], [hx + u * 0.02, hy - u * 0.12]], or);
    poly([[hx + u * 0.02, hy - u * 0.12], [hx + u * 0.12, hy - u * 0.42], [hx + u * 0.2, hy - u * 0.08]], or);
    ell(hx, hy, u * 0.22, u * 0.18, or);
    poly([[hx + u * 0.1, hy - u * 0.06], [hx + u * 0.42, hy + u * 0.04], [hx + u * 0.1, hy + u * 0.14]], '#fff0e0');
    ell(hx + u * 0.42, hy + u * 0.04, 1.8, 1.8, '#1a1010');
    ctx.strokeStyle = '#1a1010';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (fo.mode === 3) {
      ctx.moveTo(hx - 2, hy - 4);
      ctx.lineTo(hx + 2, hy);
      ctx.moveTo(hx + 2, hy - 4);
      ctx.lineTo(hx - 2, hy);
    } else ctx.arc(hx + u * 0.04, hy - u * 0.02, 2.2, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    if (fo.mode === 3) (ell(hx - u * 0.02, hy - u * 0.22, u * 0.2, u * 0.11, '#fffaf0'), ell(hx - u * 0.02, hy - u * 0.24, u * 0.1, u * 0.07, '#ffd23a'));
    ctx.restore();
    if (fo.mode === 3) bubble(x, y - S * 1.45, '깨갱!', R(0.034));
    else if (fo.mode === 2) bubble(x, y - S * 1.45, '히히', R(0.032));
    else if (fo.tgt >= 0 && s.t % 90 < 45) bubble(x, y - S * 1.45, '킁킁…', R(0.032));
  }
  function drawMillTower() {
    const m = c.mill!, hx = LX(m[0]), hy = LY(m[1]), bz = LZ + 0.24, bx = X(m[0], bz), by = Y(bz, 0);
    ell(bx + 4, by + 2, S * 0.8, S * 0.2, 'rgba(0,0,0,.2)');
    poly([[bx - S * 0.55, by], [bx + S * 0.55, by], [hx + S * 0.22, hy + S * 0.2], [hx - S * 0.22, hy + S * 0.2]], mix('#f4ece0', '#4a4850', dark * 0.6));
    poly([[bx + S * 0.1, by], [bx + S * 0.55, by], [hx + S * 0.22, hy + S * 0.2], [hx + S * 0.04, hy + S * 0.2]], 'rgba(0,0,0,.1)');
    ctx.fillStyle = '#6a4024';
    ctx.beginPath();
    ctx.roundRect(bx - S * 0.18, by - S * 0.6, S * 0.36, S * 0.6, [5, 5, 0, 0]);
    ctx.fill();
    ctx.fillStyle = dusk > 0.08 ? '#ffd86a' : mix('#7ab8d8', '#2a3a4a', dark);
    ctx.fillRect(hx - S * 0.1, (by + hy) / 2 - S * 0.15, S * 0.2, S * 0.24);
    poly([[hx - S * 0.35, hy + S * 0.22], [hx + S * 0.35, hy + S * 0.22], [hx, hy - S * 0.35]], mix('#8a4a2a', '#2a1410', dark * 0.6));
  }
  function drawMillBlades() {
    const m = c.mill!, hx = LX(m[0]), hy = LY(m[1]), a0 = millA(s, T0);
    for (let k = 0; k < 3; k++) {
      const a = a0 + (k * TAU) / 3, dx = Math.cos(a), dy = -Math.sin(a), L = MR * S;
      ctx.strokeStyle = mix('#7a5030', '#2a1a10', dark * 0.6);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx + dx * L, hy + dy * L);
      ctx.stroke();
      // 날개 천 (격자)
      const nx = -dy, ny = dx, w0 = S * 0.36;
      poly([[hx + dx * L * 0.25, hy + dy * L * 0.25], [hx + dx * L * 0.92, hy + dy * L * 0.92], [hx + dx * L * 0.92 + nx * w0, hy + dy * L * 0.92 + ny * w0], [hx + dx * L * 0.25 + nx * w0 * 0.8, hy + dy * L * 0.25 + ny * w0 * 0.8]], mix('#faf4e8', '#4a4850', dark * 0.6));
      ctx.strokeStyle = 'rgba(120,80,50,.45)';
      ctx.lineWidth = 0.8;
      for (let q = 1; q < 4; q++) {
        const t = 0.25 + q * 0.17;
        ctx.beginPath();
        ctx.moveTo(hx + dx * L * t, hy + dy * L * t);
        ctx.lineTo(hx + dx * L * t + nx * w0 * 0.9, hy + dy * L * t + ny * w0 * 0.9);
        ctx.stroke();
      }
    }
    ell(hx, hy, S * 0.16, S * 0.16, mix('#5a3a20', '#1a100a', dark * 0.6));
    // 바구니 둥지 (늘 똑바로 매달림)
    for (let i = 0; i < s.nests.length; i++) {
      const n = s.nests[i];
      if (n.kind !== 2) continue;
      nestPos(s, n, T0);
      const x = LX(NX), y = LY(NY), tipY = LY(NY + 0.45), rw = S * n.r * 1.25;
      ctx.strokeStyle = mix('#8a6a4a', '#2a2018', dark * 0.6);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, tipY);
      ctx.lineTo(x - rw * 0.8, y);
      ctx.moveTo(x, tipY);
      ctx.lineTo(x + rw * 0.8, y);
      ctx.stroke();
      nestShape(x, y, rw, n.mult, n.vals.length < n.cap ? 0.6 : 0);
      contents(n, x, y, rw);
      if (n.vals.length < n.cap) tag(x, y + rw * 0.9, n.mult);
    }
  }
}

// ───────────────────────────── 봇 ─────────────────────────────
const OFF: Input = { tap: false, dir: 0 };
const HOLD: Input = { tap: false, dir: 0, hold: true };
const moods = new WeakMap<object, { press: number; hold: number; key: number }>();

/** 못하는 봇: 아무 때나 누르고 아무만큼 누른다 */
export const eggcannonRandom: Bot<EggState> = {
  name: '아무렇게나',
  act(s, rng) {
    if (s.phase !== 'day' || s.endAt >= 0 || (s.left <= 0 && s.charge === 0)) return OFF;
    const key = s.key * 100 + s.shot;
    let m = moods.get(s);
    if (!m || m.key !== key) moods.set(s, (m = { press: s.t + 15 + Math.floor(rng() * 100), hold: 8 + Math.floor(rng() * 140), key }));
    if (s.charge === 0) return s.t >= m.press ? HOLD : OFF;
    return s.charge < m.hold ? HOLD : OFF;
  },
};

const SIM: Egg = { x: 0, y: 0, vx: 0, vy: 0, w: 0, gold: false, bounce: 0, spin: 0, trail: [] };
/** 한 발 흉내: T(그날 시각)에 떼고 H틱 누른 알이 어디에 닿나. frozen이면 움직이는 것들을 지금 자리에 세워 둔다(안내선) */
function shoot(s: EggState, T: number, th: number, H: number, gold: boolean, w: number, full: Uint8Array | null, frozen: boolean, maxN: number, stopBounce: boolean, pts: number[] | null): number {
  const v = powerOf(H), k0 = T - s.dayT, fx0 = s.fox.mode === 1 ? s.fox.x : -99;
  SIM.x = HX;
  SIM.y = HY;
  SIM.vx = v * Math.cos(th);
  SIM.vy = v * Math.sin(th);
  SIM.w = w;
  SIM.gold = gold;
  SIM.bounce = 0;
  for (let n = 1; n <= maxN; n++) {
    const r = tick(s, SIM, frozen ? T : T + n, frozen ? fx0 : foxPred(s, k0 + n - 1), full);
    if (pts && (n % 3 === 0 || r !== FLY)) pts.push(SIM.x, SIM.y);
    if (r === FLY || (r === BOUNCE && !stopBounce)) continue;
    return r;
  }
  return FLY;
}
/** 날아가는 알이 들어갈 둥지를 미리 셈해 둔다 */
function reserve(s: EggState): Uint8Array {
  const full = new Uint8Array(s.nests.length);
  for (let i = 0; i < s.nests.length; i++) full[i] = s.nests[i].vals.length;
  for (const e0 of s.eggs) {
    const e: Egg = { ...e0, trail: [] };
    for (let n = 1; n < 400; n++) {
      const r = tick(s, e, s.dayT + n, foxPred(s, n - 1), full);
      if (r === NEST) {
        full[hitI]++;
        break;
      }
      if (r !== FLY && r !== BOUNCE) break;
    }
  }
  return full;
}
const foxWorth = (s: EggState) => (s.fox.tgt >= 0 ? s.nests[s.fox.tgt].vals.at(-1)! + 0.4 : 0.6);
function crossX(v: number, cs: number, sn: number, w: number, g: number, ty: number) {
  const b = v * sn - g / 2, d = b * b - 2 * g * (ty - HY);
  if (d < 0) return -1e9;
  const n = (b + Math.sqrt(d)) / g;
  return HX + n * v * cs + (w * n * (n + 1)) / 2;
}
function nAt(v: number, sn: number, g: number, ty: number) {
  const b = v * sn - g / 2, d = b * b - 2 * g * (ty - HY);
  return d < 0 ? -1 : (b + Math.sqrt(d)) / g;
}
/** (tx, ty)를 내려오며 지나가려면 세기를 얼마나 (0~1, 못 닿으면 -1) */
function solveP(th: number, w: number, g: number, tx: number, ty: number) {
  const cs = Math.cos(th), sn = Math.sin(th);
  if (crossX(powP(1), cs, sn, w, g, ty) < tx) return -1;
  if (crossX(powP(0), cs, sn, w, g, ty) > tx) return 0;
  let lo = 0, hi = 1;
  for (let k = 0; k < 18; k++) {
    const m = (lo + hi) / 2;
    if (crossX(powP(m), cs, sn, w, g, ty) < tx) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

interface Plan { press: number; rel: number; v: number; raw: number; key: number; until: number; waits: number }
const plans = new WeakMap<object, Plan>();
/** 1을 3으로 나눈 나머지 칸 (봇은 3틱마다 판단하므로 누르기·떼기가 이 틱에 일어난다) */
const align = (x: number) => x + ((((1 - x) % 3) + 3) % 3);
function plan(s: EggState, waits: number): Plan {
  const now = s.t, key = s.key * 100 + s.shot, full = reserve(s);
  const gold = s.cfg.gold && s.shot % 3 === 2, g = gold ? G * GOLDG : G, gm = gold ? 2 : 1;
  const charging = s.charge > 0, P0 = charging ? s.pressT : now + Math.max(1, s.cool);
  const tg: [number, number][] = [];
  let maxV = 0;
  for (let i = 0; i < s.nests.length; i++) if (full[i] < s.nests[i].cap) tg.push([0, i]), (maxV = Math.max(maxV, s.nests[i].mult * gm));
  if (s.cfg.cow) for (const dx of [-0.45, 0, 0.45]) tg.push([1, dx]);
  if (s.cfg.fox && (s.fox.mode === 1 || (s.fox.mode === 0 && s.fox.t < 150))) tg.push([2, 0]), (maxV = Math.max(maxV, foxWorth(s)));
  let best: Plan = { press: 1e9, rel: 1e9, v: -1e9, raw: 0, key, until: now + 45, waits };
  const rEnd = charging ? P0 + OVER - 1 : P0 + FULL + ROCK;
  for (let R = align(charging ? Math.max(now + 1, P0 + MINH) : P0 + MINH); R <= rEnd; R += 3) {
    const T = s.dayT + (R - now), th = angleAt(s, T), sn = Math.sin(th);
    const tryH = (H: number) => {
      if (H < MINH || H >= OVER) return;
      const P = R - H;
      if (charging ? P !== P0 : P < P0) return;
      const r = shoot(s, T, th, H, gold, s.wind, full, false, 320, false, null);
      const v = r === NEST ? s.nests[hitI].mult * (SIM.bounce ? 2 : 1) * gm : r === FOXH ? foxWorth(s) : 0;
      const sc = v - (R - now) * 0.002;
      if (sc > best.v) best = { press: P, rel: R, v: sc, raw: v, key, until: now + 45, waits };
    };
    if (charging) {
      tryH(R - P0);
      continue;
    }
    for (const [k, a] of tg) {
      let n = 55, H = -1;
      for (let it = 0; it < (k === 0 && s.nests[a].kind === 0 ? 1 : 3); it++) {
        let tx = 0, ty = 0;
        if (k === 0) nestPos(s, s.nests[a], T + n), (tx = NX), (ty = NY);
        else if (k === 1) (tx = cowX(s, T + n) + a), (ty = CY + CRY * 0.95);
        else (tx = foxPred(s, T - s.dayT + n - 1)), (ty = FOXY + 0.15);
        if (tx < -50) break;
        const p = solveP(th, s.wind, g, tx, ty);
        if (p < 0) break;
        H = p * FULL;
        const nn = nAt(powP(p), sn, g, ty);
        if (nn < 0 || Math.abs(nn - n) < 1) break;
        n = nn;
      }
      if (H < 0) continue;
      tryH(Math.max(MINH, 3 * Math.floor(H / 3)));
      tryH(Math.max(MINH, 3 * Math.ceil(H / 3)));
    }
    if (best.raw > 0 && best.raw >= maxV) break;
  }
  if (charging && best.v === -1e9) best.rel = now + 1;
  // 지금은 좋은 수가 없으면 조금 기다렸다 다시 본다 (세 번까지)
  if (!charging && best.raw <= 0 && waits < 3) return { press: 1e9, rel: 1e9, v: 0, raw: 0, key, until: now + 45, waits: waits + 1 };
  if (!charging && best.v === -1e9) return { press: align(P0), rel: align(P0) + 30, v: 0, raw: 0, key, until: now + 45, waits };
  return best;
}

/** 잘하는 봇: 앞으로 까딱일 기울기 × 누를 시간을 흉내 내서, 둥지(쌍둥이·소 튕기기·움직이는 수레)나 여우에 닿는 한 발을 골라 그대로 누르고 뗀다 */
export const eggcannonSmart: Bot<EggState> = {
  name: '꼬꼬 명사수',
  act(s) {
    if (s.phase !== 'day' || s.endAt >= 0 || (s.left <= 0 && s.charge === 0)) return OFF;
    const key = s.key * 100 + s.shot;
    let p = plans.get(s);
    if (s.charge > 0) {
      if (!p || p.press !== s.pressT) plans.set(s, (p = plan(s, 0)));
      return s.t + 1 < p.rel ? HOLD : OFF;
    }
    if (!p || p.key !== key || (p.press < 1e9 && p.press < s.t + 1) || (p.press >= 1e9 && s.t >= p.until)) plans.set(s, (p = plan(s, p && p.key === key ? p.waits : 0)));
    return s.t + 1 >= p.press ? HOLD : OFF;
  },
};
